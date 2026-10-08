export interface CineUser {
  uid: string;
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  role: 'user' | 'admin';
  active: boolean;
  photoUrl?: string;
}

export interface PublicProfile {
  uid: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
  favoriteIds: string[];
  active: boolean;
}