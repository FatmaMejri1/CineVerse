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
      const data = snap.data() as CineUser;
      try {
        const pubSnap = await getDoc(doc(db, 'publicProfiles', uid));
        if (pubSnap.exists() && pubSnap.data()['active'] === false) {
          data.active = false;
        }
      } catch {}
      return data;
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

  /**
   * Fetch all registered users for the Admin Dashboard
   */
  async getAllUsers(): Promise<CineUser[]> {
    const usersRef = collection(db, 'users');
    const snap = await getDocs(usersRef);

    const publicActiveMap = new Map<string, boolean>();
    try {
      const pubSnap = await getDocs(collection(db, 'publicProfiles'));
      pubSnap.forEach(d => {
        if (d.data()['active'] === false) {
          publicActiveMap.set(d.id, false);
        }
      });
    } catch {}

    const users: CineUser[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const isPublicInactive = publicActiveMap.get(docSnap.id) === false;
      users.push({
        uid: docSnap.id,
        firstName: data['firstName'] || '',
        lastName: data['lastName'] || '',
        email: data['email'] || '',
        age: Number(data['age'] || 0),
        role: data['role'] === 'admin' ? 'admin' : 'user',
        active: isPublicInactive ? false : (data['active'] !== false),
        photoUrl: data['photoUrl'] || ''
      });
    });

    return users;
  }

  /**
   * Deactivate a user without deleting any document, account, or associated data
   * Safeguards against deactivating the current administrator or other administrators.
   */
  async deactivateUser(targetUid: string): Promise<void> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Authentication required.');
    }

    if (currentUser.uid === targetUid) {
      throw new Error('Self-deactivation is prohibited. You cannot deactivate your own account.');
    }

    const targetUser = await this.getUserProfile(targetUid);
    if (!targetUser) {
      throw new Error('Target user not found.');
    }

    if (targetUser.role === 'admin') {
      throw new Error('Administrators cannot be deactivated. Demote the role first if required.');
    }

    // 1. Update public profile FIRST (supported under all cloud rule versions)
    const publicRef = doc(db, 'publicProfiles', targetUid);
    await setDoc(publicRef, { active: false }, { merge: true });

    // 2. Also try updating private user document
    try {
      const userRef = doc(db, 'users', targetUid);
      await setDoc(userRef, { active: false }, { merge: true });
    } catch (err) {
      console.warn('Private user document write restricted by live cloud rules. Account deactivation successfully enforced via public profile status.');
    }
  }

  /**
   * Reactivate a previously deactivated user
   */
  async reactivateUser(targetUid: string): Promise<void> {
    const targetUser = await this.getUserProfile(targetUid);
    if (!targetUser) {
      throw new Error('Target user not found.');
    }

    // 1. Update public profile FIRST
    const publicRef = doc(db, 'publicProfiles', targetUid);
    await setDoc(publicRef, { active: true }, { merge: true });

    // 2. Also try updating private user document
    try {
      const userRef = doc(db, 'users', targetUid);
      await setDoc(userRef, { active: true }, { merge: true });
    } catch (err) {
      console.warn('Private user document write restricted by live cloud rules. Account reactivation successfully enforced via public profile status.');
    }
  }

  /**
   * Check whether the currently authenticated user is an active administrator
   */
  async isCurrentUserAdmin(): Promise<boolean> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const profile = await this.getUserProfile(currentUser.uid);
    return profile?.role === 'admin' && profile?.active !== false;
  }

  /**
   * Check whether the currently authenticated user's account is active
   */
  async isCurrentSessionActive(): Promise<boolean> {
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser) return false;

    const profile = await this.getUserProfile(currentUser.uid);
    if (!profile) return true; // Newly created or pending
    return profile.active !== false;
  }

  /**
   * Set user role (user | admin)
   */
  async setUserRole(targetUid: string, role: 'user' | 'admin'): Promise<void> {
    const userRef = doc(db, 'users', targetUid);
    await setDoc(userRef, { role }, { merge: true });
  }

  /**
   * Secure initial bootstrap: promotes target user to 'admin' ONLY if zero admins exist
   */
  async bootstrapFirstAdmin(email: string): Promise<boolean> {
    const users = await this.getAllUsers();
    const hasAdmin = users.some(u => u.role === 'admin');
    if (hasAdmin) {
      throw new Error('Bootstrap locked: An administrator already exists in the system.');
    }

    const targetUser = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!targetUser) {
      throw new Error(`User with email "${email}" not found.`);
    }

    await this.setUserRole(targetUser.uid, 'admin');
    return true;
  }
}