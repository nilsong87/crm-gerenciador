## Como obter as chaves do reCAPTCHA v3 no Google Cloud

Siga estas etapas para configurar o reCAPTCHA v3 e obter sua Chave do Site e Chave Secreta.

### 1. Acesse o Console do reCAPTCHA

Não é necessário usar o Google Cloud Platform diretamente para chaves do reCAPTCHA v3. Você pode usar o console específico do reCAPTCHA, que é mais simples.

- Vá para [https://www.google.com/recaptcha/admin/create](https://www.google.com/recaptcha/admin/create).

### 2. Registre um novo site

- **Etiqueta:** Dê um nome fácil de identificar para o seu site (ex: `CRM App v2`).
- **Tipo de reCAPTCHA:** Selecione **reCAPTCHA v3**. O reCAPTCHA v3 funciona com base em pontuações e não exibe desafios para o usuário.
- **Domínios:** Adicione os domínios onde seu site será usado. 
  - Para desenvolvimento local, adicione `localhost`.
  - Adicione o domínio do seu site de produção (ex: `meu-crm.com`).
- **Proprietários:** Verifique se o seu endereço de e-mail está listado.
- **Aceite os Termos de Serviço do reCAPTCHA.**
- Clique em **Enviar**.

### 3. Copie suas chaves

Após enviar o formulário, você será redirecionado para uma página que exibirá suas chaves:

- **Chave do site (Site Key):** Esta chave é segura para ser usada no seu código HTML/JavaScript.
- **Chave secreta (Secret Key):** **TRATE ESTA CHAVE COMO UMA SENHA.** Ela só deve ser usada no seu servidor (nas suas Cloud Functions). Não a exponha no código do lado do cliente.

Guarde essas chaves em um local seguro para usarmos na implementação...