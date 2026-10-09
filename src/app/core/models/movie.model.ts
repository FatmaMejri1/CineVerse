export interface CineMovie {
  id: string; // Firestore document ID or numeric string
  numericId?: number; // Numeric ID for compatibility with TMDB features
  title: string;
  overview: string;
  releaseDate: string; // YYYY-MM-DD or year
  genres: string[];
  posterPath: string; // TMDB path or full Storage / image URL
  backdropPath?: string;
  voteAverage: number;
  voteCount?: number;
  isCustom?: boolean; // Flag indicating added by admin
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}
