import { initializeApp } from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBA97LEupgt0XQZK0zmaCX53iUBWJrYpJY",
  authDomain: "kostrack-84a4b.firebaseapp.com",
  projectId: "kostrack-84a4b",
  storageBucket: "kostrack-84a4b.firebasestorage.app",
  messagingSenderId: "406357494303",
  appId: "1:406357494303:web:87b1b03d048e5a1912632a",
  measurementId: "G-H1RB037VLF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);