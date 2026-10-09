import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { MovieService } from '../../core/services/movie.service';
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

  currentHeroIndex = 0;
  heroMovies: any[] = [];

  constructor(
    private tmdbService: TmdbService,
    private movieService: MovieService,
    private userService: UserService,
    private authService: AuthService,
    private favoritesService: FavoritesService,
    private watchlistService: WatchlistService,
    private recommendationService: RecommendationService,
    private cdr: ChangeDetectorRef
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
    // Trigger detection immediately so cached data displays instantly on entry
    this.cdr.detectChanges();
    await this.loadInitialData();
    this.cdr.detectChanges();
  }

  getPosterUrl(pathOrMovie: any): string {
    if (!pathOrMovie) return 'https://via.placeholder.com/300x450?text=No+Poster';
    let path = '';
    if (typeof pathOrMovie === 'string') {
      path = pathOrMovie.trim();
    } else if (typeof pathOrMovie === 'object') {
      path = (pathOrMovie.poster_path || pathOrMovie.posterPath || pathOrMovie.backdrop_path || pathOrMovie.backdropPath || '').toString().trim();
    }
    if (!path) return 'https://via.placeholder.com/300x450?text=No+Poster';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('assets/')) {
      return path;
    }
    return this.imageBase + (path.startsWith('/') ? path : '/' + path);
  }

  getBackdropUrl(pathOrMovie: any): string {
    if (!pathOrMovie) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80';
    let path = '';
    if (typeof pathOrMovie === 'string') {
      path = pathOrMovie.trim();
    } else if (typeof pathOrMovie === 'object') {
      // For custom movies added by admin, always prioritize the exact URL the admin set
      if (pathOrMovie.isCustom) {
        path = (pathOrMovie.poster_path || pathOrMovie.posterPath || pathOrMovie.backdrop_path || pathOrMovie.backdropPath || '').toString().trim();
      } else {
        path = (pathOrMovie.backdrop_path || pathOrMovie.backdropPath || pathOrMovie.poster_path || pathOrMovie.posterPath || '').toString().trim();
      }
    }
    if (!path) return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1280&q=80';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('assets/')) {
      return path;
    }
    return this.backdropBase + (path.startsWith('/') ? path : '/' + path);
  }

  private populateMovies(results: any[]): void {
    this.movies = results;
    this.heroMovies = this.movies.slice(0, 4);
    this.featuredMovie = this.heroMovies[this.currentHeroIndex] || this.heroMovies[0];
    this.trendingMovies = this.movies.slice(1, 10);
    this.topRatedMovies = [...this.movies].sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0)).slice(0, 8);
    this.checkFeaturedFavorite();
    this.cdr.detectChanges();
  }

  async loadInitialData(): Promise<void> {
    if (this.movies.length === 0) {
      this.isLoading = true;
      this.cdr.detectChanges();
    }

    try {
      // 1. Fetch custom Firestore movies
      let customFormatted: any[] = [];
      try {
        const firestoreMovies = await this.movieService.getFirestoreMovies();
        customFormatted = firestoreMovies.map(cm => ({
          id: cm.numericId || cm.id,
          firestoreDocId: cm.id,
          title: cm.title,
          overview: cm.overview,
          poster_path: cm.posterPath,
          posterPath: cm.posterPath,
          backdrop_path: cm.posterPath || cm.backdropPath,
          backdropPath: cm.posterPath || cm.backdropPath,
          vote_average: cm.voteAverage,
          release_date: cm.releaseDate,
          isCustom: true
        }));
      } catch (fsErr) {
        console.warn('Firestore movies error on home:', fsErr);
      }

      // 2. Fetch TMDB movies
      let tmdbMovies: any[] = [];
      try {
        const data = await this.tmdbService.getPopularMovies();
        if (data && data.results && data.results.length > 0) {
          tmdbMovies = data.results;
        }
      } catch (tmdbErr) {
        console.warn('TMDB movies error on home:', tmdbErr);
      }

      const combined = [...customFormatted, ...tmdbMovies];
      if (combined.length > 0) {
        HomePage.cachedMovies = combined;
        this.populateMovies(combined);
      }
    } catch (err) {
      console.error('Error loading movies on home:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }

    // 3. Fetch User & Features Data
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

        this.cdr.detectChanges();
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
      this.cdr.detectChanges();
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