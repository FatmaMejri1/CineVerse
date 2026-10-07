import { Injectable } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
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

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await auth.authStateReady();
    const user = auth.currentUser;

    if (!user || !user.email) {
      throw new Error('You must be logged in to change your password.');
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }
}