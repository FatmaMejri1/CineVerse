import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

import { MovieService } from '../../../core/services/movie.service';
import { AuthService } from '../../../core/services/auth.service';
import { CineMovie } from '../../../core/models/movie.model';

@Component({
  selector: 'app-admin-movies',
  templateUrl: './admin-movies.page.html',
  styleUrls: ['./admin-movies.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    IonContent,
    IonSpinner
  ]
})
export class AdminMoviesPage implements OnInit {

  movies: CineMovie[] = [];
  filteredMovies: CineMovie[] = [];
  isLoading = true;
  errorMessage = '';
  successFeedback = '';

  // Search & Filter
  searchTerm = '';
  selectedGenreFilter = 'ALL';

  // Standard Genres
  availableGenres: string[] = [
    'Action', 'Adventure', 'Animation', 'Comedy', 'Crime',
    'Documentary', 'Drama', 'Family', 'Fantasy', 'History',
    'Horror', 'Music', 'Mystery', 'Romance', 'Science Fiction',
    'Thriller', 'War', 'Western'
  ];

  // Modal / Form state
  showMovieFormModal = false;
  isEditing = false;
  isSubmitting = false;
  formError = '';

  // Form Model
  currentMovieId: string | null = null;
  formTitle = '';
  formOverview = '';
  formReleaseDate = '';
  formSelectedGenres: string[] = [];
  formPosterUrl = '';
  formVoteAverage = 7.5;
  selectedPosterFile: File | null = null;
  posterPreviewUrl: string | null = null;

  constructor(
    private movieService: MovieService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  private isLoaded = false;

  async ngOnInit(): Promise<void> {
    if (!this.isLoaded) {
      this.isLoaded = true;
      await this.loadMovies();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    if (!this.isLoaded || this.movies.length === 0) {
      this.isLoaded = true;
      await this.loadMovies();
    } else {
      this.cdr.detectChanges();
    }
  }

  async loadMovies(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      this.movies = await this.movieService.getFirestoreMovies();
      this.applyFilter();
    } catch (err: any) {
      console.error('Error loading custom movies:', err);
      this.errorMessage = err?.message || 'Failed to load movies from Firestore.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  applyFilter(): void {
    let result = [...this.movies];

    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter(m =>
        m.title.toLowerCase().includes(term) ||
        m.overview.toLowerCase().includes(term) ||
        m.genres?.some(g => g.toLowerCase().includes(term))
      );
    }

    if (this.selectedGenreFilter !== 'ALL') {
      result = result.filter(m =>
        m.genres?.includes(this.selectedGenreFilter)
      );
    }

    this.filteredMovies = result;
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  onGenreFilterChange(genre: string): void {
    this.selectedGenreFilter = genre;
    this.applyFilter();
  }

  // ----------------------------------------------------
  // ADD & EDIT MODAL
  // ----------------------------------------------------

  openAddMovieModal(): void {
    this.isEditing = false;
    this.currentMovieId = null;
    this.formTitle = '';
    this.formOverview = '';
    this.formReleaseDate = new Date().toISOString().split('T')[0];
    this.formSelectedGenres = ['Action'];
    this.formPosterUrl = '';
    this.formVoteAverage = 8.0;
    this.selectedPosterFile = null;
    this.posterPreviewUrl = null;
    this.formError = '';
    this.showMovieFormModal = true;
  }

  openEditMovieModal(movie: CineMovie): void {
    this.isEditing = true;
    this.currentMovieId = movie.id;
    this.formTitle = movie.title;
    this.formOverview = movie.overview;
    this.formReleaseDate = movie.releaseDate;
    this.formSelectedGenres = [...(movie.genres || [])];
    this.formPosterUrl = movie.posterPath;
    this.formVoteAverage = movie.voteAverage || 7.5;
    this.selectedPosterFile = null;
    this.posterPreviewUrl = movie.posterPath;
    this.formError = '';
    this.showMovieFormModal = true;
  }

  closeModal(): void {
    if (this.isSubmitting) return;
    this.showMovieFormModal = false;
  }

  toggleGenre(genre: string): void {
    const idx = this.formSelectedGenres.indexOf(genre);
    if (idx >= 0) {
      if (this.formSelectedGenres.length > 1) {
        this.formSelectedGenres.splice(idx, 1);
      }
    } else {
      this.formSelectedGenres.push(genre);
    }
  }

  isGenreSelected(genre: string): boolean {
    return this.formSelectedGenres.includes(genre);
  }

  onPosterFileSelected(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.formError = 'Please upload a valid image file (PNG, JPG, WEBP).';
        return;
      }
      this.selectedPosterFile = file;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.posterPreviewUrl = e.target.result;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  async submitMovieForm(): Promise<void> {
    this.formError = '';

    const cleanTitle = this.formTitle.trim();
    const cleanOverview = this.formOverview.trim();
    const cleanReleaseDate = this.formReleaseDate.trim();
    const cleanPosterUrl = this.formPosterUrl.trim();

    // Validation
    if (!cleanTitle) {
      this.formError = 'Please provide a movie title.';
      return;
    }

    if (!cleanOverview) {
      this.formError = 'Please provide a synopsis / overview for the movie.';
      return;
    }

    if (!cleanReleaseDate) {
      this.formError = 'Please provide a release date (YYYY-MM-DD).';
      return;
    }

    if (this.formSelectedGenres.length === 0) {
      this.formError = 'Please select at least one genre.';
      return;
    }

    if (!cleanPosterUrl && !this.selectedPosterFile && !this.isEditing) {
      this.formError = 'Please provide a poster image URL or upload a poster file.';
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    try {
      if (this.isEditing && this.currentMovieId) {
        // Edit existing
        const finalPoster = cleanPosterUrl || this.posterPreviewUrl || '';
        await this.movieService.updateMovie(this.currentMovieId, {
          title: cleanTitle,
          overview: cleanOverview,
          releaseDate: cleanReleaseDate,
          genres: this.formSelectedGenres,
          posterPath: finalPoster,
          backdropPath: finalPoster,
          voteAverage: Number(this.formVoteAverage),
          posterFile: this.selectedPosterFile
        });

        this.successFeedback = `Movie "${cleanTitle}" updated successfully!`;
      } else {
        // Prevent duplicate title check in Firestore
        const isDuplicate = this.movies.some(m => m.title.toLowerCase() === cleanTitle.toLowerCase());
        if (isDuplicate) {
          this.formError = `A movie titled "${cleanTitle}" already exists in the catalog.`;
          this.isSubmitting = false;
          return;
        }

        // Add new
        await this.movieService.addMovie({
          title: cleanTitle,
          overview: cleanOverview,
          releaseDate: cleanReleaseDate,
          genres: this.formSelectedGenres,
          posterPath: cleanPosterUrl,
          voteAverage: Number(this.formVoteAverage),
          posterFile: this.selectedPosterFile
        });

        this.successFeedback = `Movie "${cleanTitle}" added to the CineVerse shared catalog!`;
      }

      this.showMovieFormModal = false;
      await this.loadMovies();

      setTimeout(() => {
        this.successFeedback = '';
        this.cdr.detectChanges();
      }, 4000);

    } catch (err: any) {
      console.error('Error saving movie:', err);
      this.formError = err?.message || 'An error occurred while saving the movie to Firestore.';
    } finally {
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }
  }

  async logout(): Promise<void> {
    await this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
