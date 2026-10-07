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