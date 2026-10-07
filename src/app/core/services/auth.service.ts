import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User
} from 'firebase/auth';

import { auth } from '../firebase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  async register(
    email: string,
    password: string
  ): Promise<User> {

    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return result.user;
  }

  async login(
    email: string,
    password: string
  ): Promise<User> {

    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return result.user;
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  getCurrentUser(): User | null {
    return auth.currentUser;
  }

  async waitForAuth(): Promise<User | null> {
    await auth.authStateReady();
    return auth.currentUser;
  }
}