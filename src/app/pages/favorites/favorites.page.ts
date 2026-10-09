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

  private isLoaded = false;

  async ngOnInit(): Promise<void> {
    if (!this.isLoaded) {
      this.isLoaded = true;
      await this.loadFavorites();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.isLoaded || this.favorites.length === 0) {
      this.isLoaded = true;
      await this.loadFavorites();
    } else {
      this.cdr.detectChanges();
    }
  }

  getPosterUrl(path: string | undefined): string {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('assets/')) {
      return path;
    }
    return this.imageBase + path;
  }

  async loadFavorites(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();

      if (!user) {
        this.errorMessage = 'Please sign in to view your favorites.';
        return;
      }

      this.favorites = await this.favoritesService.getFavorites();
    } catch (error: any) {
      console.error('Error loading favorites:', error);
      this.errorMessage = error?.message || 'Unable to load your favorites.';
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
      await this.favoritesService.removeFavorite(favorite.movieId);
      this.favorites = this.favorites.filter(item => item.movieKey !== favorite.movieKey);
    } catch (error: any) {
      console.error('Error removing favorite:', error);
    } finally {
      this.removingId = null;
      this.cdr.detectChanges();
    }
  }
}