import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { activeAuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then(
        (m) => m.LoginPage
      ),
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then(
        (m) => m.RegisterPage
      ),
  },

  {
    path: 'pages/register',
    redirectTo: 'register',
    pathMatch: 'full',
  },

  {
    path: 'home',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/home/home.page').then(
        (m) => m.HomePage
      ),
  },

  {
    path: 'movies',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/movies/movies.page').then(
        (m) => m.MoviesPage
      ),
  },

  {
    path: 'favorites',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/favorites/favorites.page').then(
        (m) => m.FavoritesPage
      ),
  },

  {
    path: 'watchlist',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/watchlist/watchlist.page').then(
        (m) => m.WatchlistPage
      ),
  },

  {
    path: 'matching',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/matching/matching.page').then(
        (m) => m.MatchingPage
      ),
  },

  {
    path: 'movie-details/:id',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/movie-details/movie-details.page').then(
        (m) => m.MovieDetailsPage
      ),
  },

  {
    path: 'profile',
    canActivate: [activeAuthGuard],
    loadComponent: () =>
      import('./pages/profile/profile.page').then(
        (m) => m.ProfilePage
      ),
  },

  // ════════ ADMIN ROUTES (PROTECTED BY ADMINGUARD) ════════
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/dashboard/admin-dashboard.page').then(
        (m) => m.AdminDashboardPage
      ),
  },

  {
    path: 'admin/movies',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/movies/admin-movies.page').then(
        (m) => m.AdminMoviesPage
      ),
  },

  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./pages/admin/users/admin-users.page').then(
        (m) => m.AdminUsersPage
      ),
  },

  {
    path: '**',
    redirectTo: 'login',
  },

];