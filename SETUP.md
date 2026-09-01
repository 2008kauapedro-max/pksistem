# PKSISTEM — Ativação do Supabase (passo a passo)

O código já está 100% conectado. Para o sistema funcionar de verdade, você precisa
aplicar o banco no SEU projeto Supabase. Siga na ordem:

## 1. Aplicar o banco (SQL Editor)
1. Abra seu projeto: https://unpvrudjkoeanegnowbo.supabase.co
2. Vá em **SQL Editor** (ícone no menu lateral) → **New query**.
3. Copie TODO o conteúdo do arquivo `supabase/schema.sql` e cole.
4. Clique **Run**. Deve terminar sem erros.
   - Isso cria tabelas, políticas RLS, funções, triggers e o bucket de imagens.

## 2. Criar o primeiro SUPER ADMIN (você)
No **SQL Editor**, rode (troque pelo e-mail que você vai cadastrar):
```sql
update public.profiles set is_super_admin = true where email = 'SEU_EMAIL@exemplo.com';
```
> O profile só existe depois que você cria a conta no passo 4. Então: crie a conta
> primeiro, depois rode este comando.

## 3. Ajustar o Authentication (para o cadastro funcionar na hora)
1. Vá em **Authentication → Sign In / Providers → Email**.
2. Desligue **"Confirm email"** (assim a conta ativa na hora, sem precisar de e-mail).
3. Salve.
> Se deixar ligado, o usuário precisa confirmar por e-mail antes de o negócio ser criado.

## 4. Criar sua conta (pelo próprio app)
1. Abra o PKSISTEM → **Criar conta**.
2. Preencha nome, e-mail, senha e os dados do negócio.
3. Ao entrar, volte ao SQL Editor e rode o comando do passo 2 com seu e-mail.
4. Saia e entre de novo: agora você é SUPER ADMIN e acessa o painel `/super`.

> ⚠️ NÃO use no app a senha que você compartilhou no chat. Crie uma nova e forte.

## 5. Criar mais negócios (tenants de teste)
Repita o passo 4 com outros e-mails. Cada conta vira um tenant isolado.
Para ver o isolamento: crie 2 contas, adicione produtos na conta A e confirme que
nada aparece na conta B nem no mini-site da B.

## 6. Storage (imagens)
O bucket `food-photos` é criado automaticamente pelo `schema.sql`.
Se não aparecer, crie em **Storage → New bucket** com nome `food-photos` e marque **Public**.

## O que já está protegido (não precisa fazer nada)
- **RLS** em todas as tabelas: um tenant nunca lê/edita outro (a chave pública só
  permite o que as políticas liberam).
- **RBAC** no banco: `has_perm()` — editor não exclui, viewer não edita, só owner
  concede owner/admin.
- **Super Admin** separado: `is_super_admin` no profile; usuário comum recebe 403.
- **Pedidos do site** por visitantes: via função `place_public_order` (segura,
  recalcula preço do cardápio, nunca confia no valor do cliente).
- **Senha/segredos**: a SECRET_KEY NUNCA entra no frontend.

## O que AINDA precisa de Edge Function (service_role) — opcional/avançado
- **Impersonação** ("entrar como") — exige criar sessão para outro usuário.
- **Recuperação de senha** com link customizado e **webhooks de pagamento**.
- **Convite por e-mail** criando usuário novo (hoje o convidado precisa já ter conta).

Esses são os únicos pontos que a chave pública não alcança (por design de segurança).
O restante funciona inteiro com a chave pública + RLS.
