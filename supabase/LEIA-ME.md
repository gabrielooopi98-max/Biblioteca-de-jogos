# Painel da loja: como ligar o Supabase

O painel administrativo (`#/admin`) e a loja usam o mesmo banco no Supabase. Sem ele, a loja continua funcionando com os arquivos locais (`src/dados/jogos.js` e `src/dados/produtos.js`), mas o painel mostra "Painel não configurado" e as reservas ficam só no navegador do cliente.

## 1. Criar o projeto

1. Crie uma conta em <https://supabase.com> e um projeto novo (o plano gratuito serve).
2. Em **Project Settings → API**, copie a **Project URL** e a chave **anon public**.
   - A chave `anon` pode ficar no site: quem protege os dados são as regras do banco.
   - **Nunca** coloque a chave `service_role` no site.

## 2. Criar o banco

No painel do Supabase, abra **SQL Editor** e rode, nesta ordem:

1. Todo o conteúdo de `supabase/migrations/20261019000001_painel_admin.sql`: cria as tabelas, as regras de permissão, o histórico e o armazenamento de imagens.
2. Todo o conteúdo de `supabase/seed.sql`: copia para o banco os 115 jogos e os 30 produtos atuais, com os mesmos códigos e imagens.
3. Todo o conteúdo de `supabase/migrations/20261020000001_contas_clientes.sql`: liga cada reserva à conta do cliente que a fez e cria a lista "Reservas da conta".

Os dois podem ser rodados de novo sem apagar nada. Se o catálogo dos arquivos mudar, gere um seed novo com `node scripts/gerar-seed.mjs`.

## 3. Criar o administrador

1. Em **Authentication → Users → Add user**, crie o usuário com o seu e-mail e uma senha forte, marcando **Auto Confirm User**.
2. No **SQL Editor**, transforme esse usuário em administrador (troque o e-mail):

   ```sql
   insert into public.administradores (user_id)
   select id from auth.users where email = 'seu-email@exemplo.com';
   ```

3. **Deixe o cadastro ligado** (**Authentication → Providers → Email → Allow new users to sign up**): os clientes da loja criam conta pelo site. Isso não abre o painel para ninguém: só quem está na tabela `administradores` entra, e o banco confere isso em toda ação.

Para tirar o acesso de alguém: `delete from public.administradores where user_id = '...';`

## 4. Contas de clientes (segurança)

No painel do Supabase:

1. **Authentication → URL Configuration**
   - **Site URL:** `https://gabrielooopi98-max.github.io/Biblioteca-de-jogos/`
   - **Redirect URLs:** adicione `https://gabrielooopi98-max.github.io/Biblioteca-de-jogos/**` e `http://localhost:5173/Biblioteca-de-jogos/**`. Sem isso, os links de confirmação de e-mail e de troca de senha não funcionam.
2. **Authentication → Providers → Email**
   - **Confirm email:** ligado (a conta só funciona depois de clicar no link do e-mail).
   - **Secure password change:** ligado.
   - **Minimum password length:** 8, e em **Password requirements** escolha "Lowercase, uppercase letters and digits" (as mesmas regras que o site mostra).
3. **Authentication → Rate Limits:** os limites padrão já barram tentativas em massa; não aumente.
4. **E-mails:** o envio gratuito do Supabase manda poucos e-mails por hora. Para a loja de verdade, configure um SMTP próprio em **Authentication → Emails → SMTP Settings** (Resend, Brevo, Gmail Workspace…) e personalize os textos em **Email Templates**.

O que o site já faz por conta própria:

- senha forte obrigatória, com medidor e bloqueio de senhas comuns ou com o nome e o e-mail da pessoa;
- espera crescente depois de 5 senhas erradas seguidas (na loja e no painel);
- a mesma resposta para e-mail já cadastrado ou não, para ninguém descobrir quem é cliente;
- troca de senha só com a senha atual, e "Sair de todos os aparelhos";
- login do cliente separado do login do painel: uma conta de cliente nunca vira administrador.

## 5. Ligar o site

Na pasta do projeto, crie o arquivo `.env.local` (ele não vai para o GitHub) com:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Depois rode `npm run dev` para testar ou `npm run deploy` para publicar. O deploy usa o `.env.local` do seu computador.

## 6. Testar

1. Abra `https://.../Biblioteca-de-jogos/#/admin` e entre com o e-mail e a senha do passo 3.
2. Em **Produtos → Novo produto**, cadastre um item publicado e veja se ele aparece na loja.
3. Faça uma reserva na loja e confirme em **Reservas**: o cliente passa a ver "Pronto para retirada".

## O que fica onde

| O quê | Onde |
| --- | --- |
| Produtos, preços, promoções, estoque | tabela `produtos` (a loja lê pela view `vitrine`) |
| Departamentos | tabela `categorias` |
| Reservas | tabelas `reservas` e `reserva_itens` (criadas só pela função `criar_reserva`; `user_id` liga à conta do cliente) |
| Contas de clientes | Supabase Auth (nome e celular nos dados da própria conta) |
| Movimentações de estoque | tabela `estoque_movimentos` |
| Histórico do painel | tabela `auditoria` (gravada pelo próprio banco, sem senhas nem tokens) |
| Imagens enviadas | Storage, bucket `produtos` (JPEG, PNG ou WebP até 5 MB) |

## Observações

- **Imagens da Steam:** os jogos atuais usam imagens e trailers da Steam. Para trocar por arquivos próprios ou de uso autorizado, envie a imagem na página do produto no painel.
- **Pagamento:** o site não cobra nada. A loja confere o Pix, o cartão ou o boleto no próprio banco ou maquininha e então confirma a reserva no painel.
- **Projeto pausado:** no plano gratuito, o Supabase pausa projetos sem uso por cerca de uma semana. Se a loja ficar sem os dados do banco, entre no painel do Supabase e reative o projeto. Enquanto isso, a loja mostra o último catálogo que tinha recebido.
