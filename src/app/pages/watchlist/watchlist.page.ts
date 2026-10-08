import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { WatchlistService } from '../../core/services/watchlist.service';
import { AuthService } from '../../core/services/auth.service';
import { WatchlistMovie } from '../../core/models/movie-features.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-watchlist',
  templateUrl: './watchlist.page.html',
  styleUrls: ['./watchlist.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonContent
  ]
})
export class WatchlistPage implements OnInit {

  watchlist: WatchlistMovie[] = [];
  imageBase = environment.tmdb.imageBase;

  isLoading = true;
  errorMessage = '';
  removingKey: string | null = null;

  constructor(
    private watchlistService: WatchlistService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    await this.loadWatchlist();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadWatchlist();
  }

  async loadWatchlist(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();
      if (!user) {
        this.errorMessage = 'Please sign in to view your watchlist.';
        return;
      }

      this.watchlist = await this.watchlistService.getWatchlist();
    } catch (error: any) {
      console.error('Error loading watchlist:', error);
      this.errorMessage = error?.message || 'Unable to load your watchlist.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async removeFromWatchlist(movie: WatchlistMovie): Promise<void> {
    if (!movie?.movieId) return;

    this.removingKey = movie.movieKey;
    this.cdr.detectChanges();

    try {
      await this.watchlistService.removeFromWatchlist(movie.movieId);
      this.watchlist = this.watchlist.filter(item => item.movieKey !== movie.movieKey);
    } catch (err: any) {
      console.error('Error removing from watchlist:', err);
      alert('Unable to remove movie from watchlist.');
    } finally {
      this.removingKey = null;
      this.cdr.detectChanges();
    }
  }
}
