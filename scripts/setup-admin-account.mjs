import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDQ0bQPYlJn-JFmQh1j589w3eQoOJ607to',
  authDomain: 'movie-app-ab455.firebaseapp.com',
  projectId: 'movie-app-ab455',
  storageBucket: 'movie-app-ab455.firebasestorage.app',
  messagingSenderId: '879555978855',
  appId: '1:879555978855:web:a90605019ba96927fd96c2'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const adminEmail = process.argv[2] || 'admin@cineverse.com';
const adminPassword = process.argv[3] || 'Admin1234!';

async function setupAdmin() {
  console.log(`Setting up admin account for: ${adminEmail}...`);

  let user = null;
  try {
    const cred = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    user = cred.user;
    console.log(`User already exists, logged in with UID: ${user.uid}`);
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      try {
        const cred = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        user = cred.user;
        console.log(`Created new Firebase Auth user with UID: ${user.uid}`);
      } catch (createErr) {
        console.error('Error creating user in Auth:', createErr.message);
        process.exit(1);
      }
    } else {
      console.error('Auth error:', err.message);
      process.exit(1);
    }
  }

  // Set role to 'admin' in Firestore
  const userDocRef = doc(db, 'users', user.uid);
  await setDoc(userDocRef, {
    uid: user.uid,
    firstName: 'System',
    lastName: 'Admin',
    email: adminEmail,
    role: 'admin',
    active: true,
    age: 30
  }, { merge: true });

  const publicProfileRef = doc(db, 'publicProfiles', user.uid);
  await setDoc(publicProfileRef, {
    firstName: 'System',
    lastName: 'Admin',
    active: true,
    favoriteIds: []
  }, { merge: true });

  console.log('\n========================================');
  console.log('✅ ADMIN ACCOUNT READY');
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role:     admin`);
  console.log(`Active:   true`);
  console.log('========================================\n');
  process.exit(0);
}

setupAdmin().catch(console.error);
