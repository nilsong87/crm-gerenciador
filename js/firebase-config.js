import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhGnQB2WNAGJqn4RgIaBWbIwCDAtUM9-o",
  authDomain: "crm-gerenciamento.firebaseapp.com",
  databaseURL: "https://crm-gerenciamento-default-rtdb.firebaseio.com",
  projectId: "crm-gerenciamento",
  storageBucket: "crm-gerenciamento.firebasestorage.app",
  messagingSenderId: "1069236236681",
  appId: "1:1069236236681:web:94ce5f4621558d083af158",
  measurementId: "G-LTHYVB5W44"
};

const app = initializeApp(firebaseConfig);

export { app };
