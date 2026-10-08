import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';

import { auth, db } from '../firebase';
import { CineUser, PublicProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  /**
   * Create new user profile document in both private and public collections
   */
  async createUserProfile(user: CineUser): Promise<void> {
    // 1. Private profile
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, user);

    // 2. Public profile used for community matching
    const publicProfileRef = doc(db, 'publicProfiles', user.uid);
    await setDoc(
      publicProfileRef,
      {
        firstName: user.firstName || 'Movie',
        lastName: user.lastName || 'Fan',
        photoUrl: user.photoUrl || '',
        favoriteIds: [],
        active: user.active !== false
      },
      { merge: true }
    );
  }

  /**
   * Fetch current or specified user's private profile
   */
  async getUserProfile(uid: string): Promise<CineUser | null> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data() as CineUser;
    }

    return null;
  }

  /**
   * Fetch a public profile safely (for community)
   */
  async getPublicProfile(uid: string): Promise<PublicProfile | null> {
    const pubRef = doc(db, 'publicProfiles', uid);
    const snap = await getDoc(pubRef);

    if (snap.exists()) {
      return {
        uid: snap.id,
        ...snap.data()
      } as PublicProfile;
    }

    return null;
  }

  /**
   * Update private user profile and keep public profile in sync
   */
  async updateUserProfile(uid: string, data: Partial<CineUser>): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data, { merge: true });

    // Sync public profile fields if they were modified
    const publicUpdates: Partial<PublicProfile> = {};
    if (data.firstName !== undefined) publicUpdates.firstName = data.firstName;
    if (data.lastName !== undefined) publicUpdates.lastName = data.lastName;
    if (data.photoUrl !== undefined) publicUpdates.photoUrl = data.photoUrl;
    if (data.active !== undefined) publicUpdates.active = data.active;

    if (Object.keys(publicUpdates).length > 0) {
      const publicProfileRef = doc(db, 'publicProfiles', uid);
      await setDoc(publicProfileRef, publicUpdates, { merge: true });
    }
  }

  /**
   * Update profile photo across private and public profiles
   */
  async saveProfilePhoto(uid: string, photoDataUrl: string): Promise<void> {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, { photoUrl: photoDataUrl }, { merge: true });

    const publicProfileRef = doc(db, 'publicProfiles', uid);
    await setDoc(publicProfileRef, { photoUrl: photoDataUrl }, { merge: true });
  }

  /**
   * Safely synchronize the CURRENT logged-in user's public profile
   * using their own private data and favorites.
   * This handles legacy users or any previous out-of-sync state.
   */
  async syncCurrentUserPublicProfile(): Promise<PublicProfile | null> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return null;
    }

    const uid = currentUser.uid;

    // 1. Read private profile of the CURRENT user
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.exists() ? (userSnap.data() as CineUser) : null;

    // 2. Read current user's favorites collection
    const favoritesRef = collection(db, 'users', uid, 'favorites');
    const favoritesSnap = await getDocs(favoritesRef);
    const favoriteIds = favoritesSnap.docs.map(d => d.id);

    // 3. Extract best names & photo
    const displayName = currentUser.displayName || '';
    const nameParts = displayName.split(' ');
    const fallbackFirst = nameParts[0] || 'CineVerse';
    const fallbackLast = nameParts.slice(1).join(' ') || 'Member';

    const firstName = userData?.firstName?.trim() || fallbackFirst;
    const lastName = userData?.lastName?.trim() || fallbackLast;
    const photoUrl = userData?.photoUrl || currentUser.photoURL || '';
    const active = userData?.active !== false;

    // 4. Write back to publicProfiles/{uid}
    const publicProfileData: PublicProfile = {
      uid,
      firstName,
      lastName,
      photoUrl,
      favoriteIds,
      active
    };

    const publicProfileRef = doc(db, 'publicProfiles', uid);
    await setDoc(publicProfileRef, publicProfileData, { merge: true });

    return publicProfileData;
  }
}