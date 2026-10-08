import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TmdbService {

  private baseUrl = environment.tmdb.baseUrl;
  private token = environment.tmdb.apiKey;

  private get headers(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get popular movies from TMDB
   */
  async getPopularMovies(): Promise<any> {

    const url =
      `${this.baseUrl}/movie/popular` +
      `?language=en-US` +
      `&page=1`;

    console.log('TMDB REQUEST:', url);

    try {

      const response = await fetch(
        url,
        {
          headers: this.headers
        }
      );

      console.log('TMDB STATUS:', response.status);

      if (!response.ok) {

        const errorText = await response.text();

        console.error(
          'TMDB RESPONSE ERROR:',
          errorText
        );

        throw new Error(
          `TMDB request failed with status ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        'TMDB RESPONSE:',
        data
      );

      return data;

    } catch (error) {

      console.error(
        'TMDB FETCH ERROR:',
        error
      );

      throw error;
    }
  }

  /**
   * Get details of one movie
   */
  async getMovieDetails(movieId: string): Promise<any> {

    const url =
      `${this.baseUrl}/movie/${movieId}` +
      `?language=en-US`;

    console.log(
      'TMDB DETAILS REQUEST:',
      movieId
    );

    try {

      const response = await fetch(
        url,
        {
          headers: this.headers
        }
      );

      console.log(
        'TMDB DETAILS STATUS:',
        response.status
      );

      if (!response.ok) {

        const errorText = await response.text();

        console.error(
          'TMDB DETAILS ERROR:',
          errorText
        );

        throw new Error(
          `Failed to load movie details: ${response.status}`
        );
      }

      const data = await response.json();

      console.log(
        'TMDB MOVIE DETAILS:',
        data
      );

      return data;

    } catch (error) {

      console.error(
        'TMDB DETAILS FETCH ERROR:',
        error
      );

      throw error;
    }
  }

  /**
   * Get movie recommendations for a specific movie ID
   */
  async getMovieRecommendations(movieId: number | string): Promise<any> {
    const url = `${this.baseUrl}/movie/${movieId}/recommendations?language=en-US&page=1`;

    try {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        return { results: [] };
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch recommendations for movie:', movieId, error);
      return { results: [] };
    }
  }

  /**
   * Discover movies matching genre IDs
   */
  async getMoviesByGenre(genreId: number | string): Promise<any> {
    const url = `${this.baseUrl}/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&language=en-US&page=1`;

    try {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        return { results: [] };
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch movies for genre:', genreId, error);
      return { results: [] };
    }
  }

  /**
   * Search movies by text query
   */
  async searchMovies(query: string): Promise<any> {
    if (!query || !query.trim()) {
      return { results: [] };
    }

    const url = `${this.baseUrl}/search/movie?query=${encodeURIComponent(query.trim())}&language=en-US&page=1`;

    try {
      const response = await fetch(url, { headers: this.headers });
      if (!response.ok) {
        return { results: [] };
      }
      return await response.json();
    } catch (error) {
      console.warn('Search request error:', error);
      return { results: [] };
    }
  }
}