import { app } from './firebase-config.js';
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const auth = getAuth(app);

// A URL da sua função HTTP onRequest
const verifyRecaptchaUrl = 'https://us-central1-crm-gerenciamento.cloudfunctions.net/verifyRecaptcha';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = loginForm['email'].value;
        const password = loginForm['password'].value;

        grecaptcha.ready(function() {
            grecaptcha.execute('6LdWgvQrAAAAAGHOwheVoS9z2XeFv6Md22ji4WTG', {action: 'login'}).then(async function(token) {
                try {
                    const response = await fetch(verifyRecaptchaUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ token })
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        // Verificação do reCAPTCHA bem-sucedida, prossiga com o login
                        signInWithEmailAndPassword(auth, email, password)
                            .then(userCredential => {
                                console.log('User signed in:', userCredential.user);
                                window.location.href = 'dashboard.html';
                            })
                            .catch(error => {
                                console.error('Login error:', error);
                                alert(`Erro no login: ${error.message}`);
                            });
                    } else {
                        // Falha na verificação do reCAPTCHA
                        console.error('reCAPTCHA verification failed:', result.error);
                        alert('Falha na verificação de segurança. Tente novamente.');
                    }
                } catch (error) {
                    console.error('Error calling verifyRecaptcha function:', error);
                    alert('Ocorreu um erro de segurança. Verifique sua conexão e tente novamente.');
                }
            });
        });
    });
});