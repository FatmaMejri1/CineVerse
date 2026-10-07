import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
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

  // Original list returned by TMDB
  allMovies: any[] = [];

  // TMDB poster URL
  imageBase = environment.tmdb.imageBase;

  // Page state
  isLoading = true;
  errorMessage = '';

  // Search input
  searchTerm = '';

  constructor(
    private tmdbService: TmdbService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadMovies();
  }

  /**
   * Load popular movies from TMDB
   */
  async loadMovies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.movies = [];
    this.cdr.detectChanges();

    console.log('loadMovies() called — fetching from TMDB...');

    try {
      const data = await this.tmdbService.getPopularMovies();

      console.log('RAW TMDB DATA:', data);

      if (!data || !data.results) {
        throw new Error('TMDB returned no results array');
      }

      this.movies = data.results;
      this.allMovies = data.results;

      console.log(`✅ Movies loaded: ${this.movies.length} movies`);

    } catch (error: any) {
      console.error('❌ Error loading movies:', error);
      this.errorMessage = `Failed to load movies: ${error?.message || error}`;
    } finally {
      this.isLoading = false;
      console.log('isLoading set to false. movies count:', this.movies.length, 'error:', this.errorMessage);
      this.cdr.detectChanges();
    }
  }

  /**
   * Search movies by title
   */
  searchMovies(): void {

    const term = this.searchTerm
      .trim()
      .toLowerCase();

    // If search is empty, show all movies again
    if (!term) {
      this.movies = this.allMovies;
      this.cdr.detectChanges();
      return;
    }

    // Filter movies by title
    this.movies = this.allMovies.filter((movie) =>
      movie.title?.toLowerCase().includes(term)
    );
    this.cdr.detectChanges();
  }
}