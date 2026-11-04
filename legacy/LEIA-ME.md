# Cestas de Natal: como publicar no Firebase

Endereço do site depois de publicado: **https://cestadenatal.web.app**
Área do RH: **https://cestadenatal.web.app/#admin**

## 1. Ativar o banco e o login no console (uma vez só)

No site https://console.firebase.google.com, abra o projeto **cestadenatal**:

1. **Firestore Database** → Criar banco de dados → modo de produção → região `southamerica-east1 (São Paulo)`.
2. **Authentication** → Vamos começar → Método de login → **E-mail/senha** → Ativar → Salvar.

## 2. Publicar (no terminal, dentro desta pasta)

```
npm run login
npm run deploy
```

O primeiro comando abre o navegador para você entrar com a conta Google dona do projeto.
O segundo publica o site e as regras de segurança do banco. Para atualizar o site no futuro, basta rodar `npm run deploy` de novo.

## 3. Logo depois de publicar

1. Abra https://cestadenatal.web.app/#admin e **crie o primeiro administrador na hora**, antes de divulgar o link.
   Enquanto ninguém fizer isso, qualquer pessoa que abrir essa página pode se cadastrar como primeiro administrador.
2. Importe a planilha de colaboradores (colunas Nome, CPF e Status) ou cadastre um a um.
3. Imprima o cartaz com o QR Code.

## Como a segurança funciona

- Senhas dos administradores ficam no Firebase Authentication; o painel só abre para quem está na lista de administradores.
- O colaborador não precisa de login. Ele só consegue consultar o próprio registro digitando nome **e** CPF; a lista completa é visível só para o RH.
- Sem login, a única alteração permitida é marcar a cesta como retirada (uma vez, com o horário do servidor). Nada pode ser desfeito ou apagado pela tela pública.
- Quem souber nome e CPF de outra pessoa consegue registrar a retirada no lugar dela. Confira a identidade na entrega.

## Arquivos

- `public/index.html`, `public/style.css`, `public/app.js`: o site.
- `public/firebase-config.js`: dados do projeto (não são senha).
- `firestore.rules`: regras de segurança do banco.
- `firebase.json` e `.firebaserc`: configuração da publicação.
