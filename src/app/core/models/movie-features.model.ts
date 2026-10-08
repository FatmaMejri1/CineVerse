export interface CommonMovie {
  movieKey: string;
  movieId: number;
  title: string;
  posterPath: string;
}

export interface CommunityMatch {
  uid: string;
  firstName: string;
  lastName: string;
  photoUrl: string;
  matchRate: number;
  myRate: number;
  otherRate: number;
  commonMovies: CommonMovie[];
}

export interface CommunityComment {
  id?: string;
  authorUid: string;
  authorName: string;
  authorPhotoUrl?: string;
  text: string;
  createdAt: any;
}

export interface WatchlistMovie {
  id?: string;
  movieId: number;
  movieKey: string;
  title: string;
  posterPath: string;
  releaseDate?: string;
  voteAverage?: number;
  addedAt?: any;
}

export interface MovieRating {
  movieId: number;
  movieKey: string;
  rating: number; // 1 to 5 stars
  createdAt?: any;
  updatedAt?: any;
}

export interface RecommendationMovie {
  id: number;
  title: string;
  poster_path: string;
  backdrop_path?: string;
  vote_average: number;
  release_date?: string;
  genre_ids?: number[];
  overview?: string;
  matchReason?: string;
}
