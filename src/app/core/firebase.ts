import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDQ0bQPYlJn-JFmQh1j589w3eQoOJ607to',
  authDomain: 'movie-app-ab455.firebaseapp.com',
  projectId: 'movie-app-ab455',
  storageBucket: 'movie-app-ab455.firebasestorage.app',
  messagingSenderId: '879555978855',
  appId: '1:879555978855:web:a90605019ba96927fd96c2'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);