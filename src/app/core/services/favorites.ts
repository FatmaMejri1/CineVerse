import { Injectable } from '@angular/core';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';

@Injectable({
    providedIn: 'root'
})
export class FavoritesService {

    /**
     * Add a movie to the current user's favorites
     */
    async addFavorite(movie: any): Promise<void> {
        await auth.authStateReady();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('You must be logged in to add favorites.');
        }

        const movieKey = `tmdb_${movie.id}`;

        const favoriteRef = doc(
            db,
            'users',
            user.uid,
            'favorites',
            movieKey
        );

        await setDoc(favoriteRef, {
            movieId: movie.id,
            movieKey: movieKey,
            title: movie.title,
            posterPath: movie.poster_path || '',
            releaseDate: movie.release_date || '',
            voteAverage: movie.vote_average || 0,
            addedAt: serverTimestamp()
        });

        await this.updatePublicFavoriteIds(user.uid);
    }


    /**
     * Remove a movie from the current user's favorites
     */
    async removeFavorite(movieId: number | string): Promise<void> {
        await auth.authStateReady();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('You must be logged in to remove favorites.');
        }

        const movieKey = `tmdb_${movieId}`;

        const favoriteRef = doc(
            db,
            'users',
            user.uid,
            'favorites',
            movieKey
        );

        await deleteDoc(favoriteRef);

        await this.updatePublicFavoriteIds(user.uid);
    }


    /**
     * Get all favorites of the current user
     */
    async getFavorites(): Promise<any[]> {
        await auth.authStateReady();
        const user = auth.currentUser;

        if (!user) {
            throw new Error('You must be logged in to view favorites.');
        }

        const favoritesRef = collection(
            db,
            'users',
            user.uid,
            'favorites'
        );

        const snapshot = await getDocs(favoritesRef);

        return snapshot.docs.map(docSnapshot => ({
            id: docSnapshot.id,
            ...docSnapshot.data()
        }));
    }


    /**
     * Check if a movie is already a favorite
     */
    async isFavorite(movieId: number | string): Promise<boolean> {
        await auth.authStateReady();
        const user = auth.currentUser;

        if (!user) {
            return false;
        }

        const favorites = await this.getFavorites();

        const movieKey = `tmdb_${movieId}`;

        return favorites.some(
            favorite => favorite.movieKey === movieKey
        );
    }


    /**
     * Update publicProfiles/{uid}.favoriteIds
     *
     * This array will later be used by the Matching feature.
     */
    private async updatePublicFavoriteIds(uid: string): Promise<void> {

        const favoritesRef = collection(
            db,
            'users',
            uid,
            'favorites'
        );

        const snapshot = await getDocs(favoritesRef);

        const favoriteIds = snapshot.docs.map(
            docSnapshot => docSnapshot.id
        );

        const publicProfileRef = doc(
            db,
            'publicProfiles',
            uid
        );

        await setDoc(
            publicProfileRef,
            {
                favoriteIds: favoriteIds
            },
            {
                merge: true
            }
        );
    }
}