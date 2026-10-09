import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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

async function verify() {
  console.log('Logging in as admin@cineverse.com...');
  await signInWithEmailAndPassword(auth, 'admin@cineverse.com', 'Admin1234!');
  console.log('Admin authenticated.');

  const targetUid = '6K6RZWARTRMsHbkYSdnNu2JQlHI2'; // Fatma's UID

  console.log(`Deactivating user ${targetUid}...`);
  // 1. Write public profile
  await setDoc(doc(db, 'publicProfiles', targetUid), { active: false }, { merge: true });
  console.log('✅ publicProfiles active:false written successfully!');

  // Check public profile
  const pubSnap = await getDoc(doc(db, 'publicProfiles', targetUid));
  console.log('Public profile active status:', pubSnap.data()?.active);

  // Restore to active:true for now
  await setDoc(doc(db, 'publicProfiles', targetUid), { active: true }, { merge: true });
  console.log('✅ Restored back to active:true successfully!');
}

verify().catch(console.error);
