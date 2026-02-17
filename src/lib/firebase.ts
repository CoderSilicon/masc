// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA4JO70gWWcg1pX2DQUTANM9zJEgI7DAKg",
    authDomain: "vault256-5b2da.firebaseapp.com",
    projectId: "vault256-5b2da",
    storageBucket: "vault256-5b2da.firebasestorage.app",
    messagingSenderId: "636063665597",
    appId: "1:636063665597:web:a103cdaa433c085fb0d6d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// export const db = getFirestore();
export const auth = getAuth();