import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { TmdbService } from '../../core/services/tmdb.service';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService, FavoriteItem } from '../../core/services/favorites';
import { CineUser } from '../../core/models/user.model';

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

  imageBase = 'https://image.tmdb.org/t/p/w780';
  backdropBase = 'https://image.tmdb.org/t/p/w1280';

  isLoading = true;
  movies: any[] = [];
  featuredMovie: any = null;
  trendingMovies: any[] = [];
  topRatedMovies: any[] = [];
  favorites: FavoriteItem[] = [];

  userProfile: CineUser | null = null;
  userPhoto: string = '';
  isFeaturedFavorite = false;

  selectedCategory: string = 'ALL';
  categories = ['ALL', 'TRENDING', 'TOP RATED', 'COMMUNITY', 'FAVORITES'];

  currentHeroIndex = 0;
  heroMovies: any[] = [];

  constructor(
    private tmdbService: TmdbService,
    private userService: UserService,
    private authService: AuthService,
    private favoritesService: FavoritesService
  ) {
    // Instant restore from cache if available so UI is rich from frame 0
    if (HomePage.cachedMovies.length > 0) {
      this.populateMovies(HomePage.cachedMovies);
      this.isLoading = false;
    }
    if (HomePage.cachedFavorites.length > 0) {
      this.favorites = HomePage.cachedFavorites;
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

    // 2. Fetch User & Favorites
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
}