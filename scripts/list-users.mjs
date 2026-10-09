import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDQ0bQPYlJn-JFmQh1j589w3eQoOJ607to',
  authDomain: 'movie-app-ab455.firebaseapp.com',
  projectId: 'movie-app-ab455',
  storageBucket: 'movie-app-ab455.firebasestorage.app',
  messagingSenderId: '879555978855',
  appId: '1:879555978855:web:a90605019ba96927fd96c2'
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function listUsers() {
  const snap = await getDocs(collection(db, 'users'));
  const users = [];
  snap.forEach(d => {
    users.push({
      uid: d.id,
      email: d.data().email,
      name: `${d.data().firstName || ''} ${d.data().lastName || ''}`,
      role: d.data().role || 'user',
      active: d.data().active !== false
    });
  });
  console.log('EXISTING_USERS:', JSON.stringify(users, null, 2));
}

listUsers().catch(console.error);
