// Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB-wcZGK4J7girXVNxD9qVEIRAd_ehE_m0",
  authDomain: "ai-career-success-advisor.firebaseapp.com",
  projectId: "ai-career-success-advisor",
  storageBucket: "ai-career-success-advisor.firebasestorage.app",
  messagingSenderId: "829635825677",
  appId: "1:829635825677:web:5a50142aa2ea36a2cb8544"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

export {
  auth,
  db,
  googleProvider
};