import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { FavoritesService } from '../../core/services/favorites';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-favorites',
  templateUrl: './favorites.page.html',
  styleUrls: ['./favorites.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent
  ]
})
export class FavoritesPage implements OnInit {

  favorites: any[] = [];

  imageBase = environment.tmdb.imageBase;

  isLoading = true;
  errorMessage = '';
  removingId: string | null = null;

  constructor(
    private favoritesService: FavoritesService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadFavorites();
  }

  async loadFavorites(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();

      console.log('Current Firebase user in FavoritesPage:', user);

      if (!user) {
        this.errorMessage = 'Please sign in to view your favorites.';
        return;
      }

      this.favorites = await this.favoritesService.getFavorites();

      console.log('Favorites loaded:', this.favorites);
    } catch (error: any) {
      console.error('Error loading favorites:', error);

      this.errorMessage =
        error?.message ||
        'Unable to load your favorites.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async removeFavorite(favorite: any): Promise<void> {
    if (!favorite?.movieId) {
      return;
    }

    this.removingId = favorite.movieKey;
    this.cdr.detectChanges();

    try {
      await this.favoritesService.removeFavorite(
        favorite.movieId
      );

      this.favorites =
        this.favorites.filter(
          item => item.movieKey !== favorite.movieKey
        );

      console.log(
        'Favorite removed:',
        favorite.movieKey
      );
    } catch (error: any) {
      console.error(
        'Error removing favorite:',
        error
      );

      alert(
        error?.message ||
        'Unable to remove this movie from favorites.'
      );
    } finally {
      this.removingId = null;
      this.cdr.detectChanges();
    }
  }
}