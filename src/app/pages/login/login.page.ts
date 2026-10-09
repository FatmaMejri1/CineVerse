import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IonContent,
    IonSpinner
  ]
})
export class LoginPage implements OnInit {

  email = '';
  password = '';
  showPassword = false;
  rememberMe = true;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const errorParam = this.route.snapshot.queryParamMap.get('error');
    if (errorParam === 'deactivated') {
      this.errorMessage = 'Your account has been deactivated by an administrator. Access is restricted.';
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  async login(): Promise<void> {
    this.errorMessage = '';
    this.successMessage = '';

    const cleanEmail = this.email.trim();

    if (!cleanEmail) {
      this.errorMessage = 'Please enter your email address.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      this.errorMessage = 'Please provide a valid email address.';
      return;
    }

    if (!this.password) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.isLoading = true;

    try {
      const user = await this.authService.login(
        cleanEmail,
        this.password
      );

      console.log('Login successful:', user);

      // Verify account active status
      const profile = await this.userService.getUserProfile(user.uid);
      if (profile && profile.active === false) {
        await this.authService.logout();
        this.errorMessage = 'Your CineVerse account has been deactivated by an administrator. Please contact support.';
        return;
      }

      this.successMessage = 'Welcome back!';

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || 
        (profile?.role === 'admin' ? '/admin' : '/home');
      await this.router.navigateByUrl(returnUrl);

    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = this.formatFirebaseError(error);

    } finally {
      this.isLoading = false;
    }
  }

  onForgotPassword(): void {
    const cleanEmail = this.email.trim();

    if (!cleanEmail) {
      this.errorMessage =
        'Enter your email above first, then click Forgot Password.';
      return;
    }

    this.errorMessage = '';
    this.successMessage =
      `Password reset link would be sent to ${cleanEmail}.`;
  }

  private formatFirebaseError(error: any): string {
    const code = error?.code || '';

    if (
      code.includes('invalid-credential') ||
      code.includes('wrong-password')
    ) {
      return 'Incorrect email or password. Please try again.';
    }

    if (code.includes('user-not-found')) {
      return 'No account exists with this email. Create one to get started!';
    }

    if (code.includes('invalid-email')) {
      return 'Invalid email address format.';
    }

    if (code.includes('too-many-requests')) {
      return 'Too many failed login attempts. Please wait a few moments.';
    }

    if (code.includes('network-request-failed')) {
      return 'Network connection lost. Please check your internet connection.';
    }

    return error?.message ||
      'Failed to sign in. Please check your details.';
  }
}