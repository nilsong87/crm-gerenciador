import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);
// A URL da sua função do Firebase
const verifyRecaptchaUrl = 'https://us-central1-crm-gerenciamento.cloudfunctions.net/verifyRecaptcha';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm['email'].value;
        const password = loginForm['password'].value;
        const recaptchaResponse = grecaptcha.getResponse();

        if (!recaptchaResponse) {
            alert('Por favor, complete o reCAPTCHA.');
            return;
        }

        try {
            // 1. Verificar o token do reCAPTCHA no backend
            const recaptchaResult = await fetch(verifyRecaptchaUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: recaptchaResponse })
            });

            const recaptchaData = await recaptchaResult.json();

            if (!recaptchaData.success) {
                throw new Error(recaptchaData.error || 'Falha na verificação do reCAPTCHA.');
            }

            // 2. Se o reCAPTCHA for válido, fazer login com email e senha
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('User signed in:', userCredential.user);
            window.location.href = 'dashboard.html';

        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'Ocorreu um erro no login.';
            if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                errorMessage = 'Email ou senha inválidos.';
            }
            // Se o erro for do reCAPTCHA, a mensagem já foi definida
            if (error.message.includes('reCAPTCHA')) {
                errorMessage = error.message;
            }
            alert(errorMessage);
            // Reseta o reCAPTCHA para que o usuário possa tentar novamente
            grecaptcha.reset();
        }
    });
});