import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBDk9cPUh3HXRK_AgWwb78Lf2oarpi6Huk",
  authDomain: "kirbynkatinventory.firebaseapp.com",
  projectId: "kirbynkatinventory",
  storageBucket: "kirbynkatinventory.firebasestorage.app",
  messagingSenderId: "787850404398",
  appId: "1:787850404398:web:aa24c1fd2b95d287a3f5bf"
};

// Add your email(s) here to get SUPERADMIN role on first login
export const SUPERADMIN_EMAILS = [
  "jamjamdgtls@gmail.com"
];

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore
export const db = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

export default app;
