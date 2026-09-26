import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut 
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Firebase configuration from environment or fallback demo configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCashflowGuardianDemoMockKey123",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "cashflow-guardian-main.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "cashflow-guardian-main",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "cashflow-guardian-main.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "109876543210",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:109876543210:web:abcdef123456"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in or sign up using Google Popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return {
      user: {
        id: user.uid,
        user_id: user.uid,
        full_name: user.displayName || 'Google User',
        email: user.email,
        photo_url: user.photoURL || ''
      }
    };
  } catch (error) {
    console.error('[Firebase] Google sign-in failed:', error);
    throw error;
  }
}

/**
 * Sign up a new user with Email and Password
 */
export async function signupWithEmail(fullName, email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Attach displayName to Firebase user
    if (fullName) {
      try {
        await updateProfile(user, { displayName: fullName });
      } catch (profileErr) {
        console.warn('[Firebase] Could not update displayName:', profileErr);
      }
    }

    return {
      user: {
        id: user.uid,
        user_id: user.uid,
        full_name: fullName || user.email.split('@')[0],
        email: user.email
      }
    };
  } catch (error) {
    console.error('[Firebase] Email signup failed:', error);
    throw error;
  }
}

/**
 * Sign in an existing user with Email and Password
 */
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return {
      user: {
        id: user.uid,
        user_id: user.uid,
        full_name: user.displayName || user.email.split('@')[0],
        email: user.email
      }
    };
  } catch (error) {
    console.error('[Firebase] Email login failed:', error);
    throw error;
  }
}

/**
 * Sign out current authenticated user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn('[Firebase] Sign out error:', error);
  }
}

/**
 * Save user metadata to Firestore 'users' collection
 */
export async function saveUserCredentialsToFirebase(user) {
  if (!user || (!user.id && !user.user_id)) return;
  const uid = user.id || user.user_id;

  try {
    await setDoc(doc(db, 'users', uid), {
      user_id: uid,
      email: user.email || '',
      full_name: user.full_name || user.name || '',
      photo_url: user.photo_url || '',
      last_active: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Firestore user sync skipped or unconfigured:', err);
  }
}

export default app;
