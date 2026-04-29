import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCkG3bmi_fz_x0CglC7wVOT7Tb9H3xKrsE",
  authDomain: "bin-perks.firebaseapp.com",
  projectId: "bin-perks",
  storageBucket: "bin-perks.firebasestorage.app",
  messagingSenderId: "22712490516",
  appId: "1:22712490516:web:admin",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
