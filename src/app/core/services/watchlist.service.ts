import { Injectable } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { WatchlistMovie } from '../models/movie-features.model';

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {

  /**
   * Add a movie to the current user's personal watchlist
   * Stored under: users/{uid}/watchlist/{movieKey}
   */
  async addToWatchlist(movie: any): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to save movies to your watchlist.');
    }

    const movieId = Number(movie.id || movie.movieId || 0);
    const movieKey = `tmdb_${movieId}`;
    const watchlistDocRef = doc(db, 'users', user.uid, 'watchlist', movieKey);

    const data: Partial<WatchlistMovie> = {
      movieId,
      movieKey,
      title: movie.title || 'Untitled Movie',
      posterPath: movie.poster_path || movie.posterPath || '',
      releaseDate: movie.release_date || movie.releaseDate || '',
      voteAverage: Number(movie.vote_average ?? movie.voteAverage ?? 0),
      addedAt: serverTimestamp()
    };

    await setDoc(watchlistDocRef, data, { merge: true });
  }

  /**
   * Remove a movie from the current user's watchlist
   */
  async removeFromWatchlist(movieId: number | string): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to update your watchlist.');
    }

    const cleanId = String(movieId).replace('tmdb_', '');
    const movieKey = `tmdb_${cleanId}`;
    const watchlistDocRef = doc(db, 'users', user.uid, 'watchlist', movieKey);

    await deleteDoc(watchlistDocRef);
  }

  /**
   * Fetch all movies currently in the user's watchlist
   */
  async getWatchlist(): Promise<WatchlistMovie[]> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      return [];
    }

    const watchlistRef = collection(db, 'users', user.uid, 'watchlist');

    try {
      const q = query(watchlistRef, orderBy('addedAt', 'desc'));
      const snapshot = await getDocs(q);

      return snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          movieId: Number(d['movieId'] || 0),
          movieKey: d['movieKey'] || docSnap.id,
          title: d['title'] || 'Untitled',
          posterPath: d['posterPath'] || '',
          releaseDate: d['releaseDate'] || '',
          voteAverage: Number(d['voteAverage'] || 0),
          addedAt: d['addedAt']
        } as WatchlistMovie;
      });
    } catch {
      // Fallback without orderBy in case index is not built
      const snapshot = await getDocs(watchlistRef);
      return snapshot.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          movieId: Number(d['movieId'] || 0),
          movieKey: d['movieKey'] || docSnap.id,
          title: d['title'] || 'Untitled',
          posterPath: d['posterPath'] || '',
          releaseDate: d['releaseDate'] || '',
          voteAverage: Number(d['voteAverage'] || 0),
          addedAt: d['addedAt']
        } as WatchlistMovie;
      });
    }
  }

  /**
   * Check if a specific movie is in the user's watchlist
   */
  async isInWatchlist(movieId: number | string): Promise<boolean> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      return false;
    }

    const cleanId = String(movieId).replace('tmdb_', '');
    const movieKey = `tmdb_${cleanId}`;
    const docRef = doc(db, 'users', user.uid, 'watchlist', movieKey);

    const docSnap = await getDoc(docRef);
    return docSnap.exists();
  }

  /**
   * Toggle movie in watchlist (adds if missing, removes if present)
   * Returns true if added, false if removed
   */
  async toggleWatchlist(movie: any): Promise<boolean> {
    const movieId = movie.id || movie.movieId;
    const exists = await this.isInWatchlist(movieId);

    if (exists) {
      await this.removeFromWatchlist(movieId);
      return false;
    } else {
      await this.addToWatchlist(movie);
      return true;
    }
  }
}
