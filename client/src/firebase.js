import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyBcMddXPNTMHl-8Cc3VHZs9P4Ks0vGTSXQ",
  authDomain: "college-attendance-chaitanya.firebaseapp.com",
  projectId: "college-attendance-chaitanya",
  storageBucket: "college-attendance-chaitanya.firebasestorage.app",
  messagingSenderId: "342347937787",
  appId: "1:342347937787:web:441bca6b56f43094583d5e"
};

const app = initializeApp(firebaseConfig);
export default app;
