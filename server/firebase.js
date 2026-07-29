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
      const [{ initializeApp }, firestore] = await Promise.all([
        import('firebase/app'),
        import('firebase/firestore'),
      ]);

      const app = initializeApp(firebaseConfig);
      return {
        app,
        db: firestore.getFirestore(app),
        firestore,
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
  if (
    dataUrl.startsWith('/assets/') ||
    dataUrl.startsWith('http://') ||
    dataUrl.startsWith('https://')
  ){
    return dataUrl;
  }

  const publicDir = path.resolve(__dirname, 'assets', folderName);
  await fs.mkdir(publicDir, { recursive: true });

  const writeAssetFile = async (filePath, buffer) => {
    await fs.writeFile(filePath, buffer);
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      throw new Error(`Asset file was not written: ${filePath}`);
    }
  };

  const fileNameFor = (extension) => `${filePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  // Handle data URLs (base64)
  // Accept optional parameters like charset or name: data:image/png;charset=utf-8;base64,AAAA
  const dataUrlRegex = /^data:(image\/[a-zA-Z0-9.+-]+)(?:;[^,]+)*;base64,(.+)$/i;
  const match = dataUrl.match(dataUrlRegex);
  if (match) {
    const mimeType = match[1].toLowerCase();
    const base64 = match[2];
    const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1].split('+')[0];
    const fileName = fileNameFor(extension);
    const filePath = path.join(publicDir, fileName);
    try {
      await writeAssetFile(filePath, Buffer.from(base64, 'base64'));
      console.log(`[assets] Wrote file ${filePath}`);
      return `/assets/${folderName}/${fileName}`;
    } catch (err) {
      console.error('[assets] Failed to write base64 asset', err);
      throw err;
    }
  }

  // Cloudinary URLs (or any remote URL) are already usable.
  // Store them directly instead of downloading them.
  if (/^https?:\/\//i.test(dataUrl)) {
    return dataUrl;
  }

  // Unknown format — return as-is
  return dataUrl;
}

module.exports = {
  firebaseConfig,
  getFirebaseServices,
  saveDataUrlToAsset,
};