import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },

  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },

  {
    path: 'pages/register',
    redirectTo: 'register',
    pathMatch: 'full',
  },

  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },

  {
    path: 'movies',
    loadComponent: () =>
      import('./pages/movies/movies.page').then((m) => m.MoviesPage),
  },

  {
    path: 'favorites',
    loadComponent: () =>
      import('./pages/favorites/favorites.page').then(
        (m) => m.FavoritesPage
      ),
  },

  {
    path: 'movie-details/:id',
    loadComponent: () =>
      import('./pages/movie-details/movie-details.page').then(
        (m) => m.MovieDetailsPage
      ),
  },

  {
    path: '**',
    redirectTo: 'login',
  },
];