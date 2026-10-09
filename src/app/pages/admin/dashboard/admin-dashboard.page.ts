import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { MovieService } from '../../../core/services/movie.service';
import { CineUser } from '../../../core/models/user.model';
import { CineMovie } from '../../../core/models/movie.model';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonSpinner
  ]
})
export class AdminDashboardPage implements OnInit {

  adminProfile: CineUser | null = null;
  isLoading = true;
  errorMessage = '';

  // Real statistics from Firestore
  stats = {
    totalUsers: 0,
    activeUsers: 0,
    deactivatedUsers: 0,
    adminUsers: 0,
    totalMovies: 0
  };

  recentUsers: CineUser[] = [];
  recentMovies: CineMovie[] = [];

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private movieService: MovieService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboardData();
  }

  async ionViewWillEnter(): Promise<void> {
    await this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const user = await this.authService.waitForAuth();
      if (!user) {
        await this.router.navigate(['/login']);
        return;
      }

      this.adminProfile = await this.userService.getUserProfile(user.uid);

      // Fetch users and movies in parallel
      const [allUsers, allMovies] = await Promise.all([
        this.userService.getAllUsers(),
        this.movieService.getFirestoreMovies()
      ]);

      const activeUsers = allUsers.filter(u => u.active !== false);
      const deactivatedUsers = allUsers.filter(u => u.active === false);
      const adminUsers = allUsers.filter(u => u.role === 'admin');

      this.stats = {
        totalUsers: allUsers.length,
        activeUsers: activeUsers.length,
        deactivatedUsers: deactivatedUsers.length,
        adminUsers: adminUsers.length,
        totalMovies: allMovies.length
      };

      this.recentUsers = allUsers.slice(0, 5);
      this.recentMovies = allMovies.slice(0, 4);

    } catch (err: any) {
      console.error('Error loading admin dashboard stats:', err);
      this.errorMessage = err?.message || 'Failed to load dashboard metrics from Firestore.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
