// src/lib/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; 
// [CRITICAL IMPORT] Import Cloud Functions SDK
import { getFunctions } from "firebase/functions"; 
// Import data functions (for completeness)
import { collection, getDocs, doc, getDoc, addDoc, query, where, DocumentData } from "firebase/firestore";


const firebaseConfig = {
  // Your existing configuration details
  apiKey: "AIzaSyBItMxEzj5rALmhss1CiVVIlv0gqN9_PtU",
  authDomain: "the-brand-report.firebaseapp.com",
  projectId: "the-brand-report",
  storageBucket: "the-brand-report.firebasestorage.app",
  messagingSenderId: "617493983003",
  appId: "1:617493983003:web:057c0779d7ed03cf13adbe",
  measurementId: "G-VR6TT1VZ2L"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app); 
export const auth = getAuth(app); 

// FIX: Export the Functions instance
export const functions = getFunctions(app);