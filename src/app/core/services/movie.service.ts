import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import { auth, db, storage } from '../firebase';
import { CineMovie } from '../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class MovieService {

  private readonly MOVIES_COLLECTION = 'movies';

  /**
   * Upload movie poster to Firebase Storage under movie-posters/{movieId}
   */
  async uploadPoster(movieId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `movie-posters/${movieId}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, filePath);

    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type || 'image/jpeg'
    });

    return await getDownloadURL(snapshot.ref);
  }

  /**
   * Generate a unique numeric ID for custom movies to ensure compatibility
   * with numeric-dependent features (favorites, watchlist, ratings).
   */
  private generateNumericId(): number {
    // Generate a 6-digit number starting with 9 (900000 - 999999) to avoid colliding with typical TMDB IDs
    return 900000 + Math.floor(Math.random() * 99999);
  }

  /**
   * Add a new movie to the Firestore catalog
   */
  async addMovie(movieData: {
    title: string;
    overview: string;
    releaseDate: string;
    genres: string[];
    posterPath: string;
    backdropPath?: string;
    voteAverage?: number;
    posterFile?: File | null;
  }): Promise<CineMovie> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('You must be logged in as an administrator to add movies.');
    }

    // Generate a unique document ID in the 'movies' collection
    const moviesRef = collection(db, this.MOVIES_COLLECTION);
    const newDocRef = doc(moviesRef);
    const movieId = newDocRef.id;
    const numericId = this.generateNumericId();

    let posterUrl = movieData.posterPath?.trim() || '';

    // If poster file provided, upload to Firebase Storage
    if (movieData.posterFile) {
      try {
        posterUrl = await this.uploadPoster(movieId, movieData.posterFile);
      } catch (uploadErr) {
        console.warn('Poster upload to Storage failed, falling back to URL:', uploadErr);
        if (!posterUrl) {
          throw new Error('Failed to upload movie poster. Please provide a valid poster image or image URL.');
        }
      }
    }

    const movieRecord: CineMovie = {
      id: movieId,
      numericId: numericId,
      title: movieData.title.trim(),
      overview: movieData.overview?.trim() || '',
      releaseDate: movieData.releaseDate?.trim() || new Date().toISOString().split('T')[0],
      genres: movieData.genres || [],
      posterPath: posterUrl,
      backdropPath: movieData.backdropPath?.trim() || posterUrl,
      voteAverage: movieData.voteAverage !== undefined ? Number(movieData.voteAverage) : 7.5,
      voteCount: 1,
      isCustom: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(newDocRef, movieRecord);

    return movieRecord;
  }

  /**
   * Update an existing movie record in Firestore
   */
  async updateMovie(movieId: string, data: Partial<CineMovie> & { posterFile?: File | null }): Promise<void> {
    const movieDocRef = doc(db, this.MOVIES_COLLECTION, movieId);

    let posterUrl = data.posterPath;
    if (data.posterFile) {
      posterUrl = await this.uploadPoster(movieId, data.posterFile);
    }

    const updates: any = {
      ...data,
      updatedAt: serverTimestamp()
    };
    if (posterUrl) {
      updates.posterPath = posterUrl;
      if (!data.backdropPath) {
        updates.backdropPath = posterUrl;
      }
    }
    delete updates.posterFile;

    await updateDoc(movieDocRef, updates);
  }

  /**
   * Fetch all custom movies stored in Firestore
   */
  async getFirestoreMovies(): Promise<CineMovie[]> {
    const moviesRef = collection(db, this.MOVIES_COLLECTION);
    const snap = await getDocs(moviesRef);

    const movies: CineMovie[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      movies.push({
        id: docSnap.id,
        numericId: data['numericId'] || parseInt(docSnap.id, 10) || 0,
        title: data['title'] || 'Untitled',
        overview: data['overview'] || '',
        releaseDate: data['releaseDate'] || '',
        genres: data['genres'] || [],
        posterPath: data['posterPath'] || '',
        backdropPath: data['backdropPath'] || data['posterPath'] || '',
        voteAverage: Number(data['voteAverage'] ?? 0),
        voteCount: Number(data['voteCount'] ?? 0),
        isCustom: true,
        createdAt: data['createdAt'],
        updatedAt: data['updatedAt'],
        createdBy: data['createdBy']
      });
    });

    return movies;
  }

  /**
   * Fetch a single movie from Firestore by its string or numeric ID
   */
  async getMovieById(movieId: string): Promise<CineMovie | null> {
    // 1. Direct document lookup
    const docRef = doc(db, this.MOVIES_COLLECTION, movieId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        numericId: data['numericId'] || parseInt(snap.id, 10) || 0,
        title: data['title'] || '',
        overview: data['overview'] || '',
        releaseDate: data['releaseDate'] || '',
        genres: data['genres'] || [],
        posterPath: data['posterPath'] || '',
        backdropPath: data['backdropPath'] || '',
        voteAverage: Number(data['voteAverage'] ?? 0),
        voteCount: Number(data['voteCount'] ?? 0),
        isCustom: true,
        createdAt: data['createdAt'],
        updatedAt: data['updatedAt'],
        createdBy: data['createdBy']
      };
    }

    // 2. Lookup by numericId field if provided as numeric string
    const numId = parseInt(movieId, 10);
    if (!isNaN(numId)) {
      const all = await this.getFirestoreMovies();
      const match = all.find(m => m.numericId === numId || m.id === movieId);
      if (match) return match;
    }

    return null;
  }

  /**
   * Count total movies in Firestore
   */
  async getMoviesCount(): Promise<number> {
    const moviesRef = collection(db, this.MOVIES_COLLECTION);
    const snap = await getDocs(moviesRef);
    return snap.size;
  }
}
