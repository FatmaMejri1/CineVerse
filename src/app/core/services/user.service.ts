import { Injectable } from '@angular/core';
import {
  doc,
  getDoc,
  setDoc
} from 'firebase/firestore';

import { db } from '../firebase';
import { CineUser } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  async createUserProfile(user: CineUser): Promise<void> {
    const userRef = doc(db, 'users', user.uid);

    await setDoc(userRef, user);
  }

  async getUserProfile(uid: string): Promise<CineUser | null> {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return snap.data() as CineUser;
    }

    return null;
  }

  async updateUserProfile(
    uid: string,
    data: Partial<CineUser>
  ): Promise<void> {
    const userRef = doc(db, 'users', uid);

    await setDoc(userRef, data, {
      merge: true
    });
  }

  async saveProfilePhoto(
    uid: string,
    photoDataUrl: string
  ): Promise<void> {

    const userRef = doc(db, 'users', uid);

    await setDoc(
      userRef,
      {
        photoUrl: photoDataUrl
      },
      {
        merge: true
      }
    );

    const publicProfileRef = doc(
      db,
      'publicProfiles',
      uid
    );

    await setDoc(
      publicProfileRef,
      {
        photoUrl: photoDataUrl
      },
      {
        merge: true
      }
    );
  }
}