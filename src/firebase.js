import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyALZ6EOB5ZtMEkoi8urEeB3OeV_JhVAdHo',
  authDomain: 'crackersdb.firebaseapp.com',
  projectId: 'crackersdb',
  storageBucket: 'crackersdb.firebasestorage.app',
  messagingSenderId: '82484818225',
  appId: '1:82484818225:web:67d4692c8510b290004010',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db, firebaseConfig };