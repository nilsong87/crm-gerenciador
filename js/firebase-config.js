import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

// Função para obter a configuração do Firebase dinamicamente
const getFirebaseConfig = () => {
  const hostname = window.location.hostname;

  const baseConfig = {
    apiKey: "AIzaSyBhGnQB2WNAGJqn4RgIaBWbIwCDAtUM9-o",
    projectId: "crm-gerenciamento",
    storageBucket: "crm-gerenciamento.appspot.com",
    messagingSenderId: "1069236236681",
    appId: "1:1069236236681:web:94ce5f4621558d083af158",
    measurementId: "G-LTHYVB5W44"
  };

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Configuração para ambiente de desenvolvimento local
    return {
      ...baseConfig,
      authDomain: "localhost", // ou o endereço do emulador, ex: 'localhost:9099'
      databaseURL: "https://crm-gerenciamento-default-rtdb.firebaseio.com", // Pode apontar para um emulador
    };
  } else {
    // Configuração para ambiente de produção (Vercel, GitHub Pages, etc.)
    return {
      ...baseConfig,
      authDomain: "crm-gerenciamento.firebaseapp.com",
      databaseURL: "https://crm-gerenciamento-default-rtdb.firebaseio.com",
    };
  }
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

console.log(`Firebase initialized for host: ${window.location.hostname}`, firebaseConfig);

export { app };
