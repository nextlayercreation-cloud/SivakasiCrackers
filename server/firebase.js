const fs = require('fs/promises');
const path = require('path');

const firebaseConfig = {
  apiKey: 'AIzaSyALZ6EOB5ZtMEkoi8urEeB3OeV_JhVAdHo',
  authDomain: 'crackersdb.firebaseapp.com',
  projectId: 'crackersdb',
  storageBucket: 'crackersdb.firebasestorage.app',
  messagingSenderId: '82484818225',
  appId: '1:82484818225:web:67d4692c8510b290004010',
};

let firebasePromise;

async function getFirebaseServices() {
  if (!firebasePromise) {
    firebasePromise = (async () => {
      const [{ initializeApp }, firestore, storage] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
        import('firebase/storage'),
      ]);

      const app = initializeApp(firebaseConfig);
      return {
        app,
        db: firestore.getFirestore(app),
        firestore,
        storage,
      };
    })().catch((err) => {
      firebasePromise = undefined;
      throw err;
    });
  }

  return firebasePromise;
}

async function saveDataUrlToAsset(dataUrl, folderName, filePrefix) {
  if (!dataUrl || typeof dataUrl !== 'string') return '';
  if (dataUrl.startsWith('/assets/')) return dataUrl;

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return dataUrl;

  const mimeType = match[1];
  const base64 = match[2];
  const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1].split('+')[0];
  const fileName = `${filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const publicDir = path.resolve(__dirname, '..', 'public', 'assets', folderName);
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, fileName), Buffer.from(base64, 'base64'));
  return `/assets/${folderName}/${fileName}`;
}

module.exports = {
  firebaseConfig,
  getFirebaseServices,
  saveDataUrlToAsset,
};