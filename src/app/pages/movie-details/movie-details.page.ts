import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { FavoritesService } from '../../core/services/favorites';
import { WatchlistService } from '../../core/services/watchlist.service';
import { RatingsService } from '../../core/services/ratings.service';
import { AuthService } from '../../core/services/auth.service';
import { MovieService } from '../../core/services/movie.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-movie-details',
  templateUrl: './movie-details.page.html',
  styleUrls: ['./movie-details.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent
  ]
})
export class MovieDetailsPage implements OnInit {

  movie: any = null;
  imageBase = environment.tmdb.imageBase;

  isLoading = true;
  errorMessage = '';

  // Favorites
  isFavorite = false;
  isFavoriteLoading = false;
  favoriteMessage = '';

  // Watchlist
  isWatchlist = false;
  isWatchlistLoading = false;
  watchlistMessage = '';

  // Ratings (1 to 5 stars)
  userRating: number | null = null;
  isRatingLoading = false;
  ratingFeedback = '';
  stars = [1, 2, 3, 4, 5];

  constructor(
    private route: ActivatedRoute,
    private tmdbService: TmdbService,
    private movieService: MovieService,
    private favoritesService: FavoritesService,
    private watchlistService: WatchlistService,
    private ratingsService: RatingsService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    const movieId = this.route.snapshot.paramMap.get('id');

    if (!movieId) {
      this.errorMessage = 'Movie not found.';
      this.isLoading = false;
      return;
    }

    await this.loadMovie(movieId);
  }

  getPosterUrl(): string {
    if (!this.movie) return '';
    const path = this.movie.poster_path || this.movie.posterPath || '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('assets/')) {
      return path;
    }
    return this.imageBase + path;
  }

  async loadMovie(movieId: string): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // 1. Try checking Firestore first for custom admin-added movie
      let customMovie = null;
      try {
        customMovie = await this.movieService.getMovieById(movieId);
      } catch (fsErr) {
        console.warn('Firestore lookup error:', fsErr);
      }

      if (customMovie) {
        this.movie = {
          id: customMovie.numericId || customMovie.id,
          firestoreDocId: customMovie.id,
          title: customMovie.title,
          overview: customMovie.overview,
          poster_path: customMovie.posterPath,
          backdrop_path: customMovie.posterPath || customMovie.backdropPath,
          release_date: customMovie.releaseDate,
          vote_average: customMovie.voteAverage,
          vote_count: customMovie.voteCount || 1,
          genres: customMovie.genres?.map((g: string, i: number) => ({ id: i + 1, name: g })) || [],
          isCustom: true
        };
      } else {
        // 2. Fetch from TMDB
        const data = await this.tmdbService.getMovieDetails(movieId);
        this.movie = data;
      }

      // Check current user status for this movie
      const effectiveId = this.movie?.id ? String(this.movie.id) : movieId;
      await Promise.all([
        this.checkFavorite(effectiveId),
        this.checkWatchlist(effectiveId),
        this.checkRating(effectiveId)
      ]);

    } catch (error) {
      console.error('Movie details error:', error);
      this.errorMessage = 'Unable to load movie details.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ----------------------------------------------------
  // FAVORITES
  // ----------------------------------------------------

  async checkFavorite(movieId: string): Promise<void> {
    try {
      this.isFavorite = await this.favoritesService.isFavorite(movieId);
    } catch {
      this.isFavorite = false;
    }
  }

  async toggleFavorite(): Promise<void> {
    if (!this.movie) return;

    this.isFavoriteLoading = true;
    this.favoriteMessage = '';

    try {
      if (this.isFavorite) {
        await this.favoritesService.removeFavorite(this.movie.id);
        this.isFavorite = false;
        this.favoriteMessage = 'Removed from favorites.';
      } else {
        await this.favoritesService.addFavorite(this.movie);
        this.isFavorite = true;
        this.favoriteMessage = 'Added to favorites!';
      }
    } catch (error: any) {
      console.error('Favorite error:', error);
      this.favoriteMessage = error?.message || 'Unable to update favorites.';
    } finally {
      this.isFavoriteLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.favoriteMessage = '';
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  // ----------------------------------------------------
  // WATCHLIST
  // ----------------------------------------------------

  async checkWatchlist(movieId: string): Promise<void> {
    try {
      this.isWatchlist = await this.watchlistService.isInWatchlist(movieId);
    } catch {
      this.isWatchlist = false;
    }
  }

  async toggleWatchlist(): Promise<void> {
    if (!this.movie) return;

    this.isWatchlistLoading = true;
    this.watchlistMessage = '';

    try {
      const added = await this.watchlistService.toggleWatchlist(this.movie);
      this.isWatchlist = added;
      this.watchlistMessage = added ? 'Saved to your watchlist!' : 'Removed from watchlist.';
    } catch (error: any) {
      console.error('Watchlist error:', error);
      this.watchlistMessage = error?.message || 'Unable to update watchlist.';
    } finally {
      this.isWatchlistLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.watchlistMessage = '';
        this.cdr.detectChanges();
      }, 3000);
    }
  }

  // ----------------------------------------------------
  // USER RATINGS (1 TO 5 STARS)
  // ----------------------------------------------------

  async checkRating(movieId: string): Promise<void> {
    try {
      this.userRating = await this.ratingsService.getUserRating(movieId);
    } catch {
      this.userRating = null;
    }
  }

  async rateMovie(star: number): Promise<void> {
    if (!this.movie) return;

    this.isRatingLoading = true;
    this.ratingFeedback = '';

    try {
      await this.ratingsService.setRating(this.movie, star);
      this.userRating = star;
      this.ratingFeedback = `You rated this ${star}/5 stars!`;
    } catch (err: any) {
      console.error('Rating error:', err);
      this.ratingFeedback = err?.message || 'Failed to submit rating.';
    } finally {
      this.isRatingLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.ratingFeedback = '';
        this.cdr.detectChanges();
      }, 3500);
    }
  }

  async removeRating(): Promise<void> {
    if (!this.movie) return;

    this.isRatingLoading = true;

    try {
      await this.ratingsService.removeRating(this.movie.id);
      this.userRating = null;
      this.ratingFeedback = 'Rating removed.';
    } catch (err: any) {
      console.error('Remove rating error:', err);
    } finally {
      this.isRatingLoading = false;
      this.cdr.detectChanges();
      setTimeout(() => {
        this.ratingFeedback = '';
        this.cdr.detectChanges();
      }, 2500);
    }
  }
}