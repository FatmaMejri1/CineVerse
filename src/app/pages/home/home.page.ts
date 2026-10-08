import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService, FavoriteItem } from '../../core/services/favorites';
import { WatchlistService } from '../../core/services/watchlist.service';
import { RecommendationService } from '../../core/services/recommendation.service';
import { CineUser } from '../../core/models/user.model';
import { WatchlistMovie, RecommendationMovie } from '../../core/models/movie-features.model';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonContent
  ]
})
export class HomePage implements OnInit {

  // Global static cache to prevent any flashing or empty state between page visits
  private static cachedMovies: any[] = [];
  private static cachedFavorites: FavoriteItem[] = [];
  private static cachedProfile: CineUser | null = null;
  private static cachedRecommendations: RecommendationMovie[] = [];
  private static cachedWatchlist: WatchlistMovie[] = [];

  imageBase = 'https://image.tmdb.org/t/p/w780';
  backdropBase = 'https://image.tmdb.org/t/p/w1280';

  isLoading = true;
  movies: any[] = [];
  featuredMovie: any = null;
  trendingMovies: any[] = [];
  topRatedMovies: any[] = [];
  favorites: FavoriteItem[] = [];
  recommendations: RecommendationMovie[] = [];
  watchlist: WatchlistMovie[] = [];
  recommendationReason: string = '';
  isPersonalizedRecs: boolean = false;

  userProfile: CineUser | null = null;
  userPhoto: string = '';
  isFeaturedFavorite = false;

  selectedCategory: string = 'ALL';
  categories = ['ALL', 'RECOMMENDED', 'TRENDING', 'TOP RATED', 'WATCHLIST', 'COMMUNITY', 'FAVORITES'];

  currentHeroIndex = 0;
  heroMovies: any[] = [];

  constructor(
    private tmdbService: TmdbService,
    private userService: UserService,
    private authService: AuthService,
    private favoritesService: FavoritesService,
    private watchlistService: WatchlistService,
    private recommendationService: RecommendationService
  ) {
    // Instant restore from cache if available so UI is rich from frame 0
    if (HomePage.cachedMovies.length > 0) {
      this.populateMovies(HomePage.cachedMovies);
      this.isLoading = false;
    }
    if (HomePage.cachedFavorites.length > 0) {
      this.favorites = HomePage.cachedFavorites;
    }
    if (HomePage.cachedRecommendations.length > 0) {
      this.recommendations = HomePage.cachedRecommendations;
    }
    if (HomePage.cachedWatchlist.length > 0) {
      this.watchlist = HomePage.cachedWatchlist;
    }
    if (HomePage.cachedProfile) {
      this.userProfile = HomePage.cachedProfile;
      this.userPhoto = this.userProfile.photoUrl || '';
    }
  }

  async ngOnInit(): Promise<void> {
    await this.loadInitialData();
  }

  async ionViewWillEnter(): Promise<void> {
    // When navigating to home (e.g. right after login), ensure data is loaded
    if (this.movies.length === 0) {
      await this.loadInitialData();
    } else {
      await this.refreshUserData();
    }
  }

  private populateMovies(results: any[]): void {
    this.movies = results;
    this.heroMovies = this.movies.slice(0, 4);
    this.featuredMovie = this.heroMovies[this.currentHeroIndex] || this.heroMovies[0];
    this.trendingMovies = this.movies.slice(1, 10);
    this.topRatedMovies = [...this.movies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 8);
    this.checkFeaturedFavorite();
  }

  async loadInitialData(): Promise<void> {
    if (this.movies.length === 0) {
      this.isLoading = true;
    }

    try {
      // 1. Fetch TMDB movies
      const data = await this.tmdbService.getPopularMovies();
      if (data && data.results && data.results.length > 0) {
        HomePage.cachedMovies = data.results;
        this.populateMovies(data.results);
      }
    } catch (err) {
      console.error('Error fetching TMDB movies:', err);
    } finally {
      this.isLoading = false;
    }

    // 2. Fetch User & Features Data
    await this.refreshUserData();
  }

  async refreshUserData(): Promise<void> {
    try {
      const user = await this.authService.waitForAuth();
      if (user) {
        const profile = await this.userService.getUserProfile(user.uid);
        if (profile) {
          HomePage.cachedProfile = profile;
          this.userProfile = profile;
          this.userPhoto = profile.photoUrl || user.photoURL || '';
        }

        const favs = await this.favoritesService.getFavorites();
        HomePage.cachedFavorites = favs;
        this.favorites = favs;

        this.checkFeaturedFavorite();

        // Load Watchlist
        try {
          const wl = await this.watchlistService.getWatchlist();
          this.watchlist = wl;
          HomePage.cachedWatchlist = wl;
        } catch (wlErr) {
          console.warn('Could not fetch watchlist:', wlErr);
        }

        // Load Personalized Recommendations
        try {
          const recResult = await this.recommendationService.getRecommendations();
          this.recommendations = recResult.movies;
          this.recommendationReason = recResult.reason;
          this.isPersonalizedRecs = recResult.personalized;
          HomePage.cachedRecommendations = recResult.movies;
        } catch (recErr) {
          console.warn('Could not fetch recommendations:', recErr);
        }
      }
    } catch (e) {
      console.warn('Could not fetch user/favorites info:', e);
    }
  }

  setHeroMovie(index: number): void {
    if (this.heroMovies[index]) {
      this.currentHeroIndex = index;
      this.featuredMovie = this.heroMovies[index];
      this.checkFeaturedFavorite();
    }
  }

  checkFeaturedFavorite(): void {
    if (!this.featuredMovie) return;
    const key = `tmdb_${this.featuredMovie.id}`;
    this.isFeaturedFavorite = this.favorites.some(f => f.movieKey === key);
  }

  async toggleFeaturedFavorite(event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    if (!this.featuredMovie) return;

    try {
      if (this.isFeaturedFavorite) {
        await this.favoritesService.removeFavorite(this.featuredMovie.id);
        this.isFeaturedFavorite = false;
        this.favorites = this.favorites.filter(f => f.movieKey !== `tmdb_${this.featuredMovie.id}`);
        HomePage.cachedFavorites = this.favorites;
      } else {
        await this.favoritesService.addFavorite(this.featuredMovie);
        this.isFeaturedFavorite = true;
        const newItem: FavoriteItem = {
          movieId: this.featuredMovie.id,
          movieKey: `tmdb_${this.featuredMovie.id}`,
          title: this.featuredMovie.title,
          posterPath: this.featuredMovie.poster_path,
          releaseDate: this.featuredMovie.release_date,
          voteAverage: this.featuredMovie.vote_average
        };
        this.favorites.unshift(newItem);
        HomePage.cachedFavorites = this.favorites;
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  }

  setCategory(category: string): void {
    this.selectedCategory = category;
  }

  /**
   * Enables smooth horizontal drag scrolling with mouse or touch
   * particularly useful in Android Studio Emulator and desktop testing
   */
  onDragStart(event: PointerEvent): void {
    const el = event.currentTarget as HTMLElement;
    if (!el) return;

    const startX = event.clientX;
    const scrollLeft = el.scrollLeft;
    let isDragging = false;

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        isDragging = true;
      }
      el.scrollLeft = scrollLeft - dx;
    };

    const onPointerUp = (e: PointerEvent) => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (isDragging) {
        // Suppress accidental card navigation click when user was dragging
        const captureClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        el.addEventListener('click', captureClick, { capture: true, once: true });
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }
}