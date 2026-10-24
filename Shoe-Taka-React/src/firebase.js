import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBzsCWAw_yDw8L-uyszNwaSfQjY3zUKF70",
  authDomain: "shoe-taka.firebaseapp.com",
  projectId: "shoe-taka",
  storageBucket: "shoe-taka.firebasestorage.app",
  messagingSenderId: "761580265518",
  appId: "1:761580265518:web:2debf6605ac1ab1da23fbf",
  measurementId: "G-GLZJ9ZE5F0",
};



const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Always show the Google account chooser, so you can pick which Google
// account to use (instead of silently reusing the last one).
googleProvider.setCustomParameters({ prompt: 'select_account' });


export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});