import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, updateDoc } from 'firebase/firestore';

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

async function testPermissions() {
  console.log('Logging in as admin@cineverse.com...');
  const cred = await signInWithEmailAndPassword(auth, 'admin@cineverse.com', 'Admin1234!');
  console.log('Logged in as:', cred.user.uid);

  const targetUid = '6K6RZWARTRMsHbkYSdnNu2JQlHI2';

  // Test 1: Write to publicProfiles
  console.log('\nTesting write to publicProfiles/' + targetUid + '...');
  try {
    await setDoc(doc(db, 'publicProfiles', targetUid), { active: false }, { merge: true });
    console.log('✅ publicProfiles write SUCCEEDED!');
  } catch (err) {
    console.error('❌ publicProfiles write FAILED:', err.message);
  }

  // Test 2: Write to users
  console.log('\nTesting write to users/' + targetUid + '...');
  try {
    await setDoc(doc(db, 'users', targetUid), { active: false }, { merge: true });
    console.log('✅ users write SUCCEEDED!');
  } catch (err) {
    console.error('❌ users write FAILED:', err.message);
  }
}

testPermissions().catch(console.error);
