import { Injectable } from '@angular/core';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { MovieRating } from '../models/movie-features.model';

@Injectable({
  providedIn: 'root'
})
export class RatingsService {

  /**
   * Set or update user rating (1-5 stars) for a movie
   * Stored under: users/{uid}/ratings/{movieKey}
   */
  async setRating(movie: any, rating: number): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to rate a movie.');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5 stars.');
    }

    const movieId = Number(movie.id || movie.movieId || 0);
    const movieKey = `tmdb_${movieId}`;
    const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieKey);

    const docSnap = await getDoc(ratingDocRef);
    const isNew = !docSnap.exists();

    const data: Partial<MovieRating> = {
      movieId,
      movieKey,
      rating,
      updatedAt: serverTimestamp()
    };

    if (isNew) {
      data.createdAt = serverTimestamp();
    }

    await setDoc(ratingDocRef, data, { merge: true });
  }

  /**
   * Get the current user's rating for a specific movie (1-5 or null)
   */
  async getUserRating(movieId: number | string): Promise<number | null> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const cleanId = String(movieId).replace('tmdb_', '');
    const movieKey = `tmdb_${cleanId}`;
    const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieKey);

    const docSnap = await getDoc(ratingDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return Number(data['rating'] || 0) || null;
    }

    return null;
  }

  /**
   * Remove a user's rating for a movie
   */
  async removeRating(movieId: number | string): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user) {
      throw new Error('You must be logged in to remove a rating.');
    }

    const cleanId = String(movieId).replace('tmdb_', '');
    const movieKey = `tmdb_${cleanId}`;
    const ratingDocRef = doc(db, 'users', user.uid, 'ratings', movieKey);

    await deleteDoc(ratingDocRef);
  }

  /**
   * Helper to retrieve movie rating (user's own rating)
   */
  async getMovieRating(movieId: number | string): Promise<number | null> {
    return this.getUserRating(movieId);
  }
}
