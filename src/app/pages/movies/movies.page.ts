import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { MovieService } from '../../core/services/movie.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-movies',
  templateUrl: './movies.page.html',
  styleUrls: ['./movies.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent
  ]
})
export class MoviesPage implements OnInit {

  // Movies currently displayed on the page
  movies: any[] = [];

  // Original combined list
  allMovies: any[] = [];

  // TMDB poster URL
  imageBase = environment.tmdb.imageBase;

  // Page state
  isLoading = true;
  errorMessage = '';

  // Search
  searchTerm = '';

  constructor(
    private tmdbService: TmdbService,
    private movieService: MovieService,
    private cdr: ChangeDetectorRef
  ) { }

  private isLoaded = false;

  async ngOnInit(): Promise<void> {
    if (!this.isLoaded) {
      this.isLoaded = true;
      await this.loadMovies();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.isLoaded || this.movies.length === 0) {
      this.isLoaded = true;
      await this.loadMovies();
    } else {
      this.cdr.detectChanges();
    }
  }

  getPosterUrl(movie: any): string {
    if (!movie) return '';
    const path = movie.poster_path || movie.posterPath || '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('assets/')) {
      return path;
    }
    return this.imageBase + path;
  }

  /**
   * Load movies from both Firestore custom collection and TMDB popular movies
   */
  async loadMovies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.movies = [];
    this.cdr.detectChanges();

    try {
      // 1. Fetch custom movies from Firestore
      let customFormatted: any[] = [];
      try {
        const firestoreMovies = await this.movieService.getFirestoreMovies();
        customFormatted = firestoreMovies.map(cm => ({
          id: cm.numericId || cm.id,
          firestoreDocId: cm.id,
          title: cm.title,
          overview: cm.overview,
          poster_path: cm.posterPath,
          vote_average: cm.voteAverage,
          release_date: cm.releaseDate,
          genre_ids: [],
          genres: cm.genres,
          isCustom: true
        }));
      } catch (fsErr) {
        console.warn('Could not load Firestore movies:', fsErr);
      }

      // 2. Fetch popular movies from TMDB
      let tmdbMovies: any[] = [];
      try {
        const data = await this.tmdbService.getPopularMovies();
        if (data && data.results) {
          tmdbMovies = data.results;
        }
      } catch (tmdbErr) {
        console.warn('Could not load TMDB movies:', tmdbErr);
      }

      // Merge: Custom Firestore movies first, followed by TMDB movies
      const combined = [...customFormatted, ...tmdbMovies];

      if (combined.length === 0) {
        throw new Error('No movies available from catalog or TMDB.');
      }

      this.allMovies = combined;
      this.applyFilter();

    } catch (error: any) {
      console.error('Error loading movies:', error);
      this.errorMessage = `Failed to load movies: ${error?.message || error}`;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilter(): void {
    let result = [...this.allMovies];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(movie =>
        movie.title?.toLowerCase().includes(term) ||
        movie.overview?.toLowerCase().includes(term)
      );
    }

    this.movies = result;
    this.cdr.detectChanges();
  }

  searchMovies(): void {
    this.applyFilter();
  }
}