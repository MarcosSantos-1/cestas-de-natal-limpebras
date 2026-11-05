# Cestas de Natal · Limpebras

Aplicação Next.js + TypeScript + HeroUI, com Firebase Authentication e Firestore. Duas páginas: `/` para colaboradores e `/admin` para o RH. A API roda no servidor Next.js; por isso esta versão não pode ser publicada como um site HTML estático no Firebase Hosting. O destino preparado é a Vercel, com função em São Paulo (`vercel.json`).

A versão anterior está preservada em `legacy/`. Ela não é servida nem incluída no deploy da Vercel. Os dados do aplicativo antigo não são migrados automaticamente.

## O que está implementado

- Portal mobile por etapas: apresentação → identificação → escolha → código/comprovante. No desktop, o RH possui sidebar e telas amplas; no celular, navegação inferior. Em telas muito baixas ou com teclado aberto, o conteúdo pode rolar internamente para continuar acessível.
- Identidade visual com o logo oficial da Limpebras, azul escuro, verde e amarelo; animações que respeitam a preferência por movimento reduzido.
- Campos, botões, checkbox, calendário, avisos e diálogos HeroUI. O seletor de arquivos usa o picker do sistema, acionado por botão HeroUI.
- RH abre direto na conferência rápida. A navegação inferior leva a Pessoas, Resumo e Conta; os acessos do RH ficam dentro de Conta.
- Consulta pública por nome completo e CPF válido, sem armazenar CPF no navegador.
- Retirada imediata ou agendamento por data, com QR e código no formato `LA-0025`. A lista de sílabas não inclui `CU`.
- Pedido repetido mantém o código; cancelar invalida definitivamente o código anterior. Agendar não reserva uma faixa de horário ou quantidade de vagas.
- Confirmação exclusiva pelo RH, com conferência de identificação/assinatura, horário do servidor e nome/matrícula do atendente.
- Uma entrega por CPF por campanha, protegida por transação. Não existe botão para apagar ou desfazer entregas.
- Importação `.xlsx` e `.csv` com prévia e validação de nome, verificadores do CPF, duplicidades e Ativo/Inativo. Arquivos `.xls` antigos devem ser salvos como `.xlsx`.
- Base com Nome, CPF e Matrícula, sem campo Unidade. Na importação sem Status, novos CPFs entram ativos e os status existentes são preservados. Se houver Status, ele precisa ser Ativo/Inativo e atualiza somente essa situação nos existentes. Nome, matrícula, código, agenda e entrega existentes são preservados. Ausentes da planilha não são inativados automaticamente.
- Lista paginada, busca por início do nome, matrícula exata ou CPF completo, exportação Excel e data da última inativação. A reativação conserva essa data; cada mudança também fica no histórico de auditoria.
- Avisos e erros são toasts temporários HeroUI, sem ocupar espaço abaixo das listas. Informações do comprovante usam texto maior e nome abreviado do conferidor; o histórico e a exportação preservam o nome completo.
- Criação de acessos pelo RH (nome, matrícula e senha/confirmar senha), remoção de acesso sem apagar suas entregas e proteção do administrador inicial.
- Painel com contagens da campanha e QR do portal para impressão.

## 1. Preparar o Firebase real

Use o projeto **cesta-de-natal-limpebras**. O aplicativo já contém sua configuração web pública. Ela não substitui as credenciais do servidor.

1. Crie o Firestore, caso ainda não exista, em modo de produção. Se puder escolher a localização, use São Paulo (`southamerica-east1`).
2. Em Authentication, habilite E-mail/senha e crie seu usuário manualmente, com e-mail e senha. Copie seu **UID**.
3. Em Configurações do projeto → Contas de serviço, obtenha uma credencial de serviço para o backend. Configure `client_email` e `private_key` nos campos abaixo. Não coloque o JSON em `public/`, no Git ou no chat. Na Vercel, salve a chave como variável Secret do servidor.
4. Copie `.env.example` para `.env.local` e preencha:

| Variável                      | Conteúdo                                                              |
| ----------------------------- | --------------------------------------------------------------------- |
| `FIREBASE_PROJECT_ID`         | `cesta-de-natal-limpebras`                                            |
| `FIREBASE_CLIENT_EMAIL`       | `client_email` da credencial de serviço                               |
| `FIREBASE_PRIVATE_KEY`        | `private_key`, entre aspas em `.env.local`, com quebras reais ou `\n` |
| `EMPLOYEE_LOOKUP_SECRET`      | Segredo aleatório, com pelo menos 32 caracteres                       |
| `BOOTSTRAP_ADMIN_UID`         | UID do seu usuário do Authentication                                  |
| `BOOTSTRAP_ADMIN_NAME`        | Nome completo que aparecerá nas entregas                              |
| `BOOTSTRAP_ADMIN_EMPLOYEE_ID` | Sua matrícula                                                         |
| `CAMPAIGN_ID`                 | `natal-2026`, identificador estável da campanha                       |
| `CAMPAIGN_LABEL`              | `Natal 2026`                                                          |

Para gerar o segredo:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guarde esse segredo junto da configuração da campanha. Ele gera os identificadores por CPF usando HMAC; alterá-lo após importar a base faria os cadastros antigos deixarem de ser localizados. Uma troca exige migração planejada.

Somente o UID configurado pode inicializar o primeiro administrador. Outros usuários criados diretamente no Authentication não recebem acesso ao RH. Os administradores seguintes são criados no painel e entram pela matrícula; internamente, o Authentication usa um endereço técnico, sem envio de e-mail. O primeiro usuário entra pelo e-mail real criado no console.

## 2. Rodar e publicar

Requer Node.js 22 ou superior e npm. Testado localmente com Node.js 24.

```powershell
npm ci
npm run dev
```

Abra `http://localhost:3000/admin` e entre com seu e-mail. O servidor criará seu perfil autorizado no primeiro acesso. Confira nome e matrícula antes de fazer entregas.

Na Vercel, importe o repositório como Next.js. Use `npm run build` e configure as mesmas variáveis em Settings → Environment Variables. Não configure variáveis de emulador em produção. Use um projeto Firebase separado para Preview/homologação; o perfil de Preview não deve escrever na base real.

No Authentication → Settings → Authorized domains, adicione o domínio definitivo. Depois publique as regras do banco:

```powershell
npm run firebase:login
npm run deploy:rules
```

O comando tem o projeto `cesta-de-natal-limpebras` explícito e publica somente regras/índices. Elas recusam acesso direto pelo navegador; toda leitura/escrita passa pela API autorizada. Não publique essas regras sobre uma aplicação antiga em operação sem coordenar a troca: a versão antiga deixará de acessar o banco.

O rótulo da campanha é lido no build. Faça um novo deploy quando mudar a configuração. O agendamento é livre a partir do dia atual no fuso de São Paulo e não depende de `PICKUP_START_DATE` ou `PICKUP_END_DATE`; essas variáveis antigas podem ser removidas. O backend usa o Admin SDK no servidor: as permissões são verificadas pela API, não pelas regras do cliente.

## 3. Abrir a campanha

1. Entre em `/admin`. Sem colaboradores, o painel oferece a importação inicial.
2. Baixe o modelo CSV. Colunas obrigatórias: **Matricula**, **Nome**, **CPF**, como na base fornecida. **Status** é opcional e, se presente, aceita exatamente **Ativo** ou **Inativo**. Sem Status, a reimportação nunca reativa alguém que já esteja inativo.
3. CPF pode vir formatado; valores numéricos com zeros iniciais perdidos são completados e passam pela validação dos verificadores. Prefira CPF como texto no Excel.
4. Confira a prévia e corrija todos os erros. Só então confirme. Há limite de 8 MB/30 mil linhas por arquivo; lotes de 100 são enviados ao servidor. Se houver falha parcial, corrija a conexão e reenvie: reimportar é seguro para o histórico de entrega.
5. Crie acessos individuais para os atendentes. Todos os acessos desta versão possuem as mesmas permissões administrativas. O acesso somente de leitura para gestores ainda não foi implementado.
6. Baixe o QR do portal em **Resumo → QR do portal público**. Ele sempre aponta para `https://cestas-de-natal-limpebras.vercel.app/`, inclusive quando gerado no localhost ou em Preview.
7. Faça um piloto com cadastros de homologação antes de importar a base real e divulgar o cartaz.

A leitura pela câmera depende de HTTPS e da permissão do navegador; a digitação manual sempre está disponível. O checkbox registra a declaração do atendente de que fez a conferência conforme o procedimento da unidade. Não captura uma assinatura digital nem armazena a folha assinada.

No portal, o colaborador pode consultar novamente a entrega. Enquanto o código está aberto, a situação é atualizada a cada 30 segundos com a aba visível; há também atualização manual. Datas e horas são exibidas em português e no fuso de São Paulo.

## 4. Proteção contra abuso e operação

Há limites persistentes por CPF, usuário do RH e IP, com contadores por IP divididos para reduzir disputa na rede corporativa. São barreiras de abuso, não comprovação de identidade. Na Vercel, o cabeçalho de IP da plataforma é priorizado. Ao hospedar em outra infraestrutura, ajuste a política de proxy confiável.

Para a divulgação pública, configure Firebase App Check com reCAPTCHA Enterprise para o domínio definitivo: informe `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY`, configure a aplicação no console e defina `REQUIRE_APP_CHECK=true` no servidor. Faça novo deploy e valide o acesso. A integração valida o token App Check na API. Sem essa configuração, a proteção adicional permanece desabilitada.

No Firestore, habilite a política TTL para o campo `expiresAt` do grupo `rateLimits`, para limpar os contadores antigos. O vencimento não depende da limpeza: os limites usam janelas de tempo separadas. Monitore erros, consumo e filas durante o piloto.

Definam com o RH o período de guarda da base e dos registros e mantenham backup/configuração do projeto. Não há exclusão de colaboradores ou de entregas pelo painel. Correções excepcionais exigem procedimento administrativo fora desta versão, preservando a auditoria.

Nome e CPF permitem gerar/cancelar um pedido em nome de outra pessoa. A barreira que autoriza a entrega física é a conferência pelo RH, com conta individual. Código curto e QR não substituem identificação. Agendamentos futuros aparecem na conferência e não bloqueiam uma entrega antecipada autorizada pelo atendente.

## 5. Testes locais sem acessar produção

Os testes de integração e dados fictícios exigem os emuladores **demo-cestas**; o seed recusa outro projeto/campanha. Requer Java 21+.

Terminal 1:

```powershell
npm run emulators
```

Se o Java do Android Studio no Windows falhar com `Unable to establish loopback connection`, use somente nesse terminal a alternativa testada:

```powershell
$env:JAVA_TOOL_OPTIONS='-Djdk.net.unixdomain.tmpdir=C:/codex-unavailable-unix-sockets -Dio.netty.eventLoopThreads=4'
npm run emulators
```

Ela força a alternativa TCP do Java quando o socket Unix temporário não pode ser criado. Não crie a pasta indicada.

Terminal 2, para testes de integração:

```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
$env:FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
npm run test:integration
```

Para navegar e testar a interface, configure os valores abaixo em um terminal local ou em `.env.local` **somente de desenvolvimento**. Se já houver uma `.env.local` real, guarde-a em segurança antes de substituir e não misture os ambientes:

```dotenv
FIREBASE_PROJECT_ID=demo-cestas
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
NEXT_PUBLIC_USE_EMULATORS=true
EMPLOYEE_LOOKUP_SECRET=local-browser-secret-more-than-32-characters
CAMPAIGN_ID=browser-tests
CAMPAIGN_LABEL=Natal 2026 · teste local
```

`tsx` não carrega `.env.local` automaticamente. Para `seed:demo`, exporte essas variáveis no terminal PowerShell (`$env:NOME='valor'`) ou use `node --env-file=.env.local --conditions=react-server --import tsx tests/seed-demo.ts`.

```powershell
npm run seed:demo
npm run dev
```

O seed reinicializa somente a campanha `browser-tests` no projeto emulado, com três pessoas fictícias. Acesso local: **rh@example.test / TesteLocal123!**. Cadastro disponível para consultar: **João da Silva / 529.982.247-25**.

Com esse servidor aberto, em outro terminal:

```powershell
npm run test
npm run typecheck
npm run test:browser
npm run build
```

Os testes de navegador usam o Chrome instalado. O fluxo modifica os dados fictícios; rode o seed novamente antes de repetir a suíte. O teste de agendamento escolhe uma data dois meses à frente, sem janela fixa.

Validados: entrega concorrente, código cancelado, colaborador inativo, preservação da entrega e da inativação na reimportação sem Status, autorização por UID, acesso direto negado pelas regras, criação/remoção de administrador, consulta por nome/CPF, exportação, calendário e diálogos HeroUI. A revisão de layout inclui celulares 360×640, 375×667, 390×844, 430×932 e desktop. A câmera física e a infraestrutura real ainda exigem um piloto no local da entrega.

## Organização para aprender e manter

| Arquivo/pasta                    | Responsabilidade                                       |
| -------------------------------- | ------------------------------------------------------ |
| `src/app/page.tsx`               | Página pública e conteúdo inicial renderizado no build |
| `src/components/public-flow.tsx` | Consulta, pedido, agendamento e comprovante            |
| `src/components/admin-app.tsx`   | Login e painel do RH                                   |
| `src/components/scanner.tsx`     | Câmera, carregada só quando solicitada                 |
| `src/app/api/operation/route.ts` | Entrada da API, limite, autenticação e erros           |
| `src/server/service.ts`          | Regras de negócio, transações e autorização            |
| `src/server/firebase.ts`         | Credenciais privadas e conexão do servidor             |
| `src/lib/domain.ts`              | Tipos e validações compartilhados                      |
| `src/lib/spreadsheet.ts`         | Leitura e exportação, carregadas sob demanda           |
| `firestore.rules`                | Bloqueio do acesso direto do cliente ao banco          |

Coleções: `admins/{uid}`, `campaigns/{campanha}/employees/{hmacCpf}`, `codes/{codigo}` e `audit/{evento}` dentro de cada campanha, além de `rateLimits/{hash}`. Códigos cancelados permanecem reservados para impedir que um QR antigo seja reutilizado para outro colaborador.

As páginas iniciais são pré-renderizadas. A lista usa páginas de 100 registros e a visão geral usa contagens no servidor. Excel e câmera não entram no carregamento inicial do portal. Não foi feito teste de carga de milhares de acessos; faça homologação com volume e rede próximos aos da operação.
