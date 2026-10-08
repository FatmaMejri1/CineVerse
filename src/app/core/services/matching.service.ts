import { Injectable } from '@angular/core';
import {
  collection,
  getDocs
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { UserService } from './user.service';

export interface CommonMovie {
  movieKey: string;
  movieId: number;
  title: string;
  posterPath: string;
}

interface FavoriteMovie {
  movieKey: string;
  movieId: number;
  title: string;
  posterPath: string;
}

export interface CommunityMatch {
  uid: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  matchRate: number;
  myRate: number;
  otherRate: number;
  commonMovies: CommonMovie[];
}

@Injectable({
  providedIn: 'root'
})
export class MatchingService {

  constructor(
    private userService: UserService
  ) { }

  /**
   * Find community matches with compatibility strictly ABOVE 75%.
   * Enforces mutual compatibility so two-sided matches are genuine.
   */
  async findMatches(): Promise<CommunityMatch[]> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('You must be logged in to access the movie community.');
    }

    // 1. Ensure current user's public profile is safely synced first
    try {
      await this.userService.syncCurrentUserPublicProfile();
    } catch (syncErr) {
      console.warn('Could not auto-sync current public profile:', syncErr);
    }

    // 2. Fetch current user's favorites
    const myFavoritesRef = collection(db, 'users', currentUser.uid, 'favorites');
    const myFavoritesSnapshot = await getDocs(myFavoritesRef);

    const myFavoritesMap = new Map<string, FavoriteMovie>();
    for (const docSnap of myFavoritesSnapshot.docs) {
      const data = docSnap.data();
      const movieKey = docSnap.id;
      myFavoritesMap.set(movieKey, {
        movieKey,
        movieId: Number(data['movieId'] || 0),
        title: String(data['title'] || 'Untitled movie'),
        posterPath: String(data['posterPath'] || '')
      });
    }

    const myFavorites = Array.from(myFavoritesMap.values());

    if (myFavorites.length === 0) {
      // User has no favorites yet
      return [];
    }

    // 3. Fetch all public profiles
    const profilesRef = collection(db, 'publicProfiles');
    const profilesSnapshot = await getDocs(profilesRef);

    const matches: CommunityMatch[] = [];

    // 4. Compare with every other member
    for (const profileDoc of profilesSnapshot.docs) {
      // Skip myself
      if (profileDoc.id === currentUser.uid) {
        continue;
      }

      const profile = profileDoc.data();

      // Skip inactive users
      if (profile['active'] === false) {
        continue;
      }

      // Extract & clean other user's favorite IDs (deduplicate & filter falsy)
      const rawOtherFavorites: string[] = profile['favoriteIds'] || [];
      const otherFavoriteIds = Array.from(new Set(rawOtherFavorites.filter(id => Boolean(id))));

      if (otherFavoriteIds.length === 0) {
        continue;
      }

      // 5. Identify common movies
      const commonMovies: CommonMovie[] = [];
      for (const favorite of myFavorites) {
        if (otherFavoriteIds.includes(favorite.movieKey)) {
          commonMovies.push({
            movieKey: favorite.movieKey,
            movieId: favorite.movieId,
            title: favorite.title,
            posterPath: favorite.posterPath
          });
        }
      }

      if (commonMovies.length === 0) {
        continue;
      }

      // 6. Calculate compatibility percentages
      const myRate = (commonMovies.length / myFavorites.length) * 100;
      const otherRate = (commonMovies.length / otherFavoriteIds.length) * 100;

      // Taste compatibility must be at or above 75%
      const displayRate = Math.round(Math.max(myRate, (myRate + otherRate) / 2));

      if (myRate >= 75 || otherRate >= 75 || displayRate >= 75) {
        // Sanitize names to prevent "Unknown User"
        let firstName = String(profile['firstName'] || '').trim();
        let lastName = String(profile['lastName'] || '').trim();

        if (!firstName && !lastName) {
          firstName = 'CineVerse';
          lastName = 'Member';
        } else if (!firstName) {
          firstName = 'Member';
        }

        matches.push({
          uid: profileDoc.id,
          firstName,
          lastName,
          photoUrl: String(profile['photoUrl'] || ''),
          matchRate: displayRate,
          myRate: Math.round(myRate),
          otherRate: Math.round(otherRate),
          commonMovies
        });
      }
    }

    // 7. Sort by highest compatibility first
    matches.sort((a, b) => b.matchRate - a.matchRate);

    return matches;
  }

  /**
   * Return total count of favorites for the logged-in user
   * Useful for displaying guidance in empty states.
   */
  async getMyFavoritesCount(): Promise<number> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) return 0;

    const favoritesRef = collection(db, 'users', currentUser.uid, 'favorites');
    const snapshot = await getDocs(favoritesRef);
    return snapshot.size;
  }
}