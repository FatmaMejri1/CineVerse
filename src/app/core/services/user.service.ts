import { Injectable } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';

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
}