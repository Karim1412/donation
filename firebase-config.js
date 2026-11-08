// =====================================================================
//  Firebase config  (needed so ALL phones see the same counter & history)
//  Steps are explained in README.md  →  "Étape 1 : Firebase"
//
//  Replace the values below with the ones from your Firebase project.
//  While apiKey is "PASTE_...", the app runs in DEMO mode
//  (data saved only on the current phone, via localStorage).
// =====================================================================
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXH3cppvGPZfu5PCWuBRIUyhqAgoFCTq4",
  authDomain: "donation-a8966.firebaseapp.com",
  projectId: "donation-a8966",
  storageBucket: "donation-a8966.firebasestorage.app",
  messagingSenderId: "115483777416",
  appId: "1:115483777416:web:94987e43fb087a33a5423d",
  measurementId: "G-60V8HCT404"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
