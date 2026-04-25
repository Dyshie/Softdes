// Firebase configuration
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9WUH-INDwCiYQlSKJVYrjo7iQRzVvu5Q",
  authDomain: "h2go-eee4d.firebaseapp.com",
  databaseURL: "https://h2go-eee4d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "h2go-eee4d",
  storageBucket: "h2go-eee4d.firebasestorage.app",
  messagingSenderId: "906637137047",
  appId: "1:906637137047:web:6c4121ead7c6e0504445d2",
  measurementId: "G-3HBLLLFM7B"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
