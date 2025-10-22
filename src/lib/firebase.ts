// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

import { collection, getDocs, doc, getDoc, addDoc, query, where, DocumentData } from "firebase/firestore";
import { Petition } from "./data/mockData";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBItMxEzj5rALmhss1CiVVIlv0gqN9_PtU",
  authDomain: "the-brand-report.firebaseapp.com",
  projectId: "the-brand-report",
  storageBucket: "the-brand-report.firebasestorage.app",
  messagingSenderId: "617493983003",
  appId: "1:617493983003:web:057c0779d7ed03cf13adbe",
  measurementId: "G-VR6TT1VZ2L"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const db = getFirestore(app);