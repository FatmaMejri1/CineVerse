/**
 * CineVerse CLI Admin Authorization Script
 * Usage: node scripts/make-admin.mjs <target-email>
 * Example: node scripts/make-admin.mjs admin@cineverse.com
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

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

const targetEmail = process.argv[2]?.trim().toLowerCase();

if (!targetEmail) {
  console.error('\n❌ Error: Please specify the user email.');
  console.log('Usage: node scripts/make-admin.mjs <user-email>\n');
  process.exit(1);
}

async function promoteToAdmin() {
  console.log(`\n🔍 Searching Firestore for user with email: ${targetEmail}...`);

  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);

  let targetUid = null;
  let targetData = null;

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    if (data.email && data.email.toLowerCase() === targetEmail) {
      targetUid = docSnap.id;
      targetData = data;
    }
  });

  if (!targetUid) {
    console.error(`\n❌ No registered user found with email: ${targetEmail}`);
    console.log('Please register this user in the CineVerse app first, then re-run this script.\n');
    process.exit(1);
  }

  console.log(`✅ Found user: ${targetData.firstName} ${targetData.lastName} (UID: ${targetUid})`);
  console.log(`Current Role: ${targetData.role || 'user'}`);

  const userDocRef = doc(db, 'users', targetUid);
  await setDoc(userDocRef, { role: 'admin', active: true }, { merge: true });

  console.log(`🎉 SUCCESS: User "${targetEmail}" has been granted "admin" role and activated!`);
  console.log('You can now log in as this user and access /admin.\n');
  process.exit(0);
}

promoteToAdmin().catch(err => {
  console.error('\n❌ Error promoting user:', err);
  process.exit(1);
});
