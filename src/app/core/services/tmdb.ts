import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class TmdbService {

    private baseUrl = environment.tmdb.baseUrl;
    private apiKey = environment.tmdb.apiKey;

    async getPopularMovies(): Promise<any> {
        const url =
            `${this.baseUrl}/movie/popular?api_key=${this.apiKey}&language=en-US&page=1`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('Failed to fetch movies from TMDB');
        }

        return response.json();
    }
}