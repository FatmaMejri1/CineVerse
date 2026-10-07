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

  constructor() {}

  // Register a new user
  async register(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    return result.user;
  }

  // Login an existing user
  async login(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    return result.user;
  }

  // Logout
  async logout(): Promise<void> {
    await signOut(auth);
  }

  // Get the currently authenticated user
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
}