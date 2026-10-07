import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { FavoritesService } from '../../core/services/favorites';
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
  isFavorite = false;
  isFavoriteLoading = false;

  errorMessage = '';
  favoriteMessage = '';

  constructor(
    private route: ActivatedRoute,
    private tmdbService: TmdbService,
    private favoritesService: FavoritesService,
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

  async loadMovie(movieId: string): Promise<void> {

    this.isLoading = true;
    this.errorMessage = '';

    try {

      const data =
        await this.tmdbService.getMovieDetails(movieId);

      this.movie = data;

      console.log('Movie details:', this.movie);

      await this.checkFavorite(movieId);

    } catch (error) {

      console.error('Movie details error:', error);

      this.errorMessage =
        'Unable to load movie details.';

    } finally {

      this.isLoading = false;
      this.cdr.detectChanges();

    }
  }

  async checkFavorite(movieId: string): Promise<void> {

    try {

      this.isFavorite =
        await this.favoritesService.isFavorite(movieId);

    } catch (error) {

      console.error(
        'Error checking favorite:',
        error
      );

      this.isFavorite = false;
    }

    this.cdr.detectChanges();
  }

  async toggleFavorite(): Promise<void> {

    if (!this.movie) {
      return;
    }

    this.isFavoriteLoading = true;
    this.favoriteMessage = '';

    try {

      if (this.isFavorite) {

        await this.favoritesService.removeFavorite(
          this.movie.id
        );

        this.isFavorite = false;

        this.favoriteMessage =
          'Removed from favorites.';

      } else {

        await this.favoritesService.addFavorite(
          this.movie
        );

        this.isFavorite = true;

        this.favoriteMessage =
          'Added to favorites! ❤️';
      }

    } catch (error: any) {

      console.error(
        'Favorite error:',
        error
      );

      this.favoriteMessage =
        error?.message ||
        'Unable to update favorites.';

    } finally {

      this.isFavoriteLoading = false;
      this.cdr.detectChanges();

    }
  }
}