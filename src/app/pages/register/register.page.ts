import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonSpinner
  ]
})
export class RegisterPage {
  firstName = '';
  lastName = '';
  age: number | null = null;
  email = '';
  password = '';
  confirmPassword = '';

  showPassword = false;
  agreeTerms = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get passwordStrength(): { score: number; label: string; class: string } {
    if (!this.password) {
      return { score: 0, label: '', class: '' };
    }

    let score = 0;
    if (this.password.length >= 6) score++;
    if (this.password.length >= 10) score++;
    if (/[A-Z]/.test(this.password) && /[a-z]/.test(this.password)) score++;
    if (/[0-9]/.test(this.password) || /[^A-Za-z0-9]/.test(this.password)) score++;

    if (score <= 1) {
      return { score: 1, label: 'Weak', class: 'weak' };
    } else if (score === 2) {
      return { score: 2, label: 'Fair', class: 'fair' };
    } else if (score === 3) {
      return { score: 3, label: 'Good', class: 'good' };
    } else {
      return { score: 4, label: 'Strong', class: 'strong' };
    }
  }

  async register(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const cleanFirst = this.firstName.trim();
    const cleanLast = this.lastName.trim();
    const cleanEmail = this.email.trim();

    if (!cleanFirst || !cleanLast) {
      this.errorMessage = 'Please enter your first and last name.';
      return;
    }

    if (!this.age || this.age < 10 || this.age > 120) {
      this.errorMessage = 'Please enter a valid age between 10 and 120.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      this.errorMessage = 'Please provide a valid email address.';
      return;
    }

    if (!this.password || this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match. Please re-enter.';
      return;
    }

    if (!this.agreeTerms) {
      this.errorMessage = 'You must accept the CineVerse terms of service.';
      return;
    }

    this.isLoading = true;

    try {
      const user = await this.authService.register(cleanEmail, this.password);

      await this.userService.createUserProfile({
        uid: user.uid,
        firstName: cleanFirst,
        lastName: cleanLast,
        age: this.age,
        email: cleanEmail,
        role: 'user',
        active: true
      });

      console.log('User registered successfully:', user);
      this.successMessage = 'Account created successfully! Welcome to CineVerse.';

      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1200);

    } catch (error: any) {
      console.error('Registration error:', error);
      this.errorMessage = this.formatFirebaseError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private formatFirebaseError(error: any): string {
    const code = error?.code || '';
    if (code.includes('email-already-in-use')) {
      return 'This email address is already registered. Please sign in instead.';
    }
    if (code.includes('invalid-email')) {
      return 'Invalid email address format.';
    }
    if (code.includes('weak-password')) {
      return 'Password is too weak. Please use at least 6 characters with mixed symbols.';
    }
    if (code.includes('network-request-failed')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    return error?.message || 'Failed to create account. Please check your input.';
  }
}