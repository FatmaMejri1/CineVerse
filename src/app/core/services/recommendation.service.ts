import { Injectable } from '@angular/core';

import { TmdbService } from './tmdb.service';
import { FavoritesService } from './favorites';
import { WatchlistService } from './watchlist.service';
import { RecommendationMovie } from '../models/movie-features.model';

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {

  constructor(
    private tmdbService: TmdbService,
    private favoritesService: FavoritesService,
    private watchlistService: WatchlistService
  ) { }

  /**
   * Get personalized recommendations for the logged-in user.
   * If the user has favorites, recommendations are tailored from them.
   * Excludes movies already in user's favorites and watchlist.
   * Falls back gracefully if user has no favorites yet.
   */
  async getRecommendations(): Promise<{
    personalized: boolean;
    reason: string;
    movies: RecommendationMovie[];
  }> {
    try {
      // 1. Fetch user's current favorites & watchlist
      const [favorites, watchlist] = await Promise.all([
        this.favoritesService.getFavorites().catch(() => []),
        this.watchlistService.getWatchlist().catch(() => [])
      ]);

      const excludedIds = new Set<number>();
      for (const fav of favorites) {
        if (fav.movieId) excludedIds.add(Number(fav.movieId));
      }
      for (const item of watchlist) {
        if (item.movieId) excludedIds.add(Number(item.movieId));
      }

      // If user has NO favorites, provide fallback
      if (favorites.length === 0) {
        const popularData = await this.tmdbService.getPopularMovies();
        const fallbackMovies: RecommendationMovie[] = (popularData?.results || [])
          .filter((m: any) => !excludedIds.has(Number(m.id)))
          .slice(0, 10)
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
            genre_ids: m.genre_ids,
            overview: m.overview,
            matchReason: 'Trending Popular Movie'
          }));

        return {
          personalized: false,
          reason: 'Start adding favorites to unlock personalized suggestions!',
          movies: fallbackMovies
        };
      }

      // 2. Fetch TMDB recommendations based on user's top favorites
      // Select up to 3 most recent favorite movies to generate recommendations
      const topFavorites = favorites.slice(0, 3);
      const candidatesMap = new Map<number, RecommendationMovie>();

      for (const fav of topFavorites) {
        try {
          const recData = await this.tmdbService.getMovieRecommendations(fav.movieId);
          const results: any[] = recData?.results || [];

          for (const m of results) {
            const mid = Number(m.id);
            // Must have a poster and not be in excluded (favorites/watchlist)
            if (m.poster_path && !excludedIds.has(mid) && !candidatesMap.has(mid)) {
              candidatesMap.set(mid, {
                id: mid,
                title: m.title,
                poster_path: m.poster_path,
                backdrop_path: m.backdrop_path,
                vote_average: m.vote_average,
                release_date: m.release_date,
                genre_ids: m.genre_ids,
                overview: m.overview,
                matchReason: `Because you liked "${fav.title}"`
              });
            }
          }
        } catch (e) {
          console.warn('Could not fetch recommendations for favorite:', fav.title, e);
        }
      }

      let recommendationList = Array.from(candidatesMap.values());

      // If not enough recommendations were returned, backfill with popular movies
      if (recommendationList.length < 5) {
        const popularData = await this.tmdbService.getPopularMovies();
        const extra = (popularData?.results || [])
          .filter((m: any) => !excludedIds.has(Number(m.id)) && !candidatesMap.has(Number(m.id)))
          .map((m: any) => ({
            id: m.id,
            title: m.title,
            poster_path: m.poster_path,
            backdrop_path: m.backdrop_path,
            vote_average: m.vote_average,
            release_date: m.release_date,
            genre_ids: m.genre_ids,
            overview: m.overview,
            matchReason: 'Trending Cinema'
          }));

        recommendationList = [...recommendationList, ...extra];
      }

      // Limit to 10 top recommendations
      const finalMovies = recommendationList.slice(0, 10);

      const topFavNames = topFavorites.map(f => f.title).join(', ');
      return {
        personalized: true,
        reason: `Curated from your favorites: ${topFavNames}`,
        movies: finalMovies
      };

    } catch (err) {
      console.error('Error generating recommendations:', err);
      return {
        personalized: false,
        reason: 'Discover popular movies across CineVerse.',
        movies: []
      };
    }
  }
}
