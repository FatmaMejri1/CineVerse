import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { UserService } from './user.service';

export interface FavoriteItem {
  id?: string;
  movieId: number;
  movieKey: string;
  title: string;
  posterPath: string;
  releaseDate?: string;
  voteAverage?: number;
  addedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {

  constructor(
    private userService: UserService
  ) { }

  /**
   * Add movie to current user's favorites and sync public profile
   */
  async addFavorite(movie: any): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to add favorites.');
    }

    const movieKey = `tmdb_${movie.id}`;
    const favoriteRef = doc(db, 'users', user.uid, 'favorites', movieKey);

    await setDoc(favoriteRef, {
      movieId: movie.id,
      movieKey: movieKey,
      title: movie.title || 'Untitled',
      posterPath: movie.poster_path || '',
      releaseDate: movie.release_date || '',
      voteAverage: movie.vote_average || 0,
      addedAt: serverTimestamp()
    });

    // Synchronize public profile
    await this.userService.syncCurrentUserPublicProfile();
  }

  /**
   * Remove movie from current user's favorites and sync public profile
   */
  async removeFavorite(movieId: number | string): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to remove favorites.');
    }

    const movieKey = `tmdb_${movieId}`;
    const favoriteRef = doc(db, 'users', user.uid, 'favorites', movieKey);

    await deleteDoc(favoriteRef);

    // Synchronize public profile
    await this.userService.syncCurrentUserPublicProfile();
  }

  /**
   * Fetch all favorites for the logged-in user
   */
  async getFavorites(): Promise<FavoriteItem[]> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to view favorites.');
    }

    const favoritesRef = collection(db, 'users', user.uid, 'favorites');
    const snapshot = await getDocs(favoritesRef);

    return snapshot.docs.map(docSnapshot => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        movieId: Number(data['movieId'] || 0),
        movieKey: data['movieKey'] || docSnapshot.id,
        title: data['title'] || 'Untitled',
        posterPath: data['posterPath'] || '',
        releaseDate: data['releaseDate'] || '',
        voteAverage: Number(data['voteAverage'] || 0),
        addedAt: data['addedAt']
      } as FavoriteItem;
    });
  }

  /**
   * Check if a specific movie is favorited
   */
  async isFavorite(movieId: number | string): Promise<boolean> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const favorites = await this.getFavorites();
    const movieKey = `tmdb_${movieId}`;

    return favorites.some(favorite => favorite.movieKey === movieKey);
  }
}