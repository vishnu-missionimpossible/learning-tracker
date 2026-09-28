/**
 * Firebase Configuration Module
 * Initializes Firebase with your project credentials
 */

const firebaseConfig = {
    apiKey: "AIzaSyDMJOVn130tvtiuncSl6uzgvDvK7i0o5XU",
    authDomain: "learning-tracker-7dfa6.firebaseapp.com",
    projectId: "learning-tracker-7dfa6",
    storageBucket: "learning-tracker-7dfa6.firebasestorage.app",
    messagingSenderId: "697835107426",
    appId: "1:697835107426:web:20c7418f257575614c4d3b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase instances for use in other modules
const auth = firebase.auth();
const db = firebase.firestore();

console.log('✓ Firebase initialized successfully');