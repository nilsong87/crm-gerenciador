import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = loginForm['email'].value;
        const password = loginForm['password'].value;

        signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                console.log('User signed in:', userCredential.user);
                window.location.href = 'dashboard.html';
            })
            .catch(error => {
                console.error('Login error:', error);
                alert(`Erro no login: ${error.message}`);
            });
    });
});