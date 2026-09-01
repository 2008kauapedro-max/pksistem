# 🍽️ Prato do Dia — Cardápio digital + Marmitas

Sistema completo para restaurantes **self-service / por quilo**: site público com o cardápio do dia, pedidos de marmita pelo **WhatsApp** e painel administrativo para gerenciar pratos, cardápio, marmitas, clientes e personalização.

```
RESTAURANTE → abre o painel → escolhe os alimentos de hoje → publica o cardápio
CLIENTE → acessa o site → vê o cardápio → monta a marmita → envia pelo WhatsApp
RESTAURANTE → recebe a mensagem → confirma e prepara a marmita
```

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Supabase (Auth + PostgreSQL/RLS + Storage) |
| Rotas | react-router (HashRouter — funciona em qualquer hospedagem estática) |

---

## Modo demonstração (sem backend)

Se `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` **não estiverem definidos**, o app roda com um banco local fictício (localStorage) para apresentação comercial:

- **E-mail:** `demo@pratododia.com`
- **Senha:** `demo1234`

> A credencial demo é **dado de demonstração**, não mecanismo de proteção. Em produção, a proteção é Supabase Auth + RLS. O código-fonte documenta isso em `src/lib/demoStore.ts` e `src/lib/supabase.ts`.

---

## Configuração com Supabase — passo a passo

### 1. Criar projeto no Supabase
Acesse [supabase.com](https://supabase.com) → **New project** → anote a região/senha.

### 2. Copiar URL e anon key
**Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon / public key` → `VITE_SUPABASE_ANON_KEY`

Crie o arquivo `.env` na raiz (copie `.env.example`):

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anon
```

> A **anon key pode ir para o frontend** porque quem manda no acesso é o RLS.
> **NUNCA** coloque a `service_role` key no frontend — ela ignora o RLS e deve ficar só em servidor/Edge Functions.

### 3. Criar tabelas, RLS e Storage
Abra o **SQL Editor** e execute **inteiro** o arquivo [`supabase/schema.sql`](supabase/schema.sql). Ele cria:

- Tabelas: `profiles`, `restaurants`, `restaurant_members`, `foods`, `daily_menu_items`, `orders`, `customers`
- **RLS habilitado em todas** com políticas de vínculo por restaurante (`my_restaurant_ids()`)
- Constraint `UNIQUE (restaurant_id, food_id, menu_date)` — **bloqueia prato duplicado no banco**, não só no frontend
- Índices em `restaurant_id`, `menu_date`, `status`, `slug`, `customer_id`
- Trigger que numera pedidos por restaurante
- Bucket Storage `food-photos` com políticas (leitura pública, escrita só do membro, caminho `r/<restaurant_id>/...`)
- Trigger que cria o `profile` automaticamente quando um usuário se cadastra

### 4. Configurar Authentication
**Authentication → Providers → Email**: deixe habilitado. Para testar localmente sem confirmar e-mail, desative **“Confirm email”** (em produção, mantenha ativo).

### 5. Criar o primeiro usuário
**Authentication → Users → Add user** → e-mail e senha do responsável pelo restaurante.

### 6. Criar o restaurante e vincular o usuário
No **SQL Editor**:

```sql
-- 6.1 Criar o restaurante
insert into public.restaurants (name, slug, description, whatsapp, address, opening_hours, instagram)
values (
  'Restaurante Sabor da Casa',
  'sabor-da-casa',                 -- slug valida o endereço /#/restaurante/sabor-da-casa
  'Comida caseira, fresquinha e feita todos os dias.',
  '5563999990000',                 -- DDI + DDD + número (só dígitos)
  'Av. das Palmeiras, 128 — Centro, Palmas/TO',
  'Seg a Sáb · 11h às 14h30',
  '@sabordacasa'
) returning id;                    -- copie o id retornado

-- 6.2 Vincular o usuário (cole os UUIDs)
insert into public.profiles (id, name)
values ('UUID-DO-USUARIO', 'Daniela Oliveira')
on conflict (id) do nothing;

insert into public.restaurant_members (restaurant_id, user_id, role)
values ('UUID-DO-RESTAURANTE', 'UUID-DO-USUARIO', 'owner');
```

O UUID do usuário aparece em **Authentication → Users**.

### 7. Storage (já feito pelo SQL)
O bucket `food-photos` é criado pelo `schema.sql`. Se preferir criar manualmente: **Storage → New bucket → `food-photos` → público**, e aplique as políticas da seção 6 do SQL.

### 8. Rodar localmente

```bash
npm install
npm run dev      # http://localhost:5173
```

### 9. Testar
- Site público: `/` · `/cardapio` · `/marmita` · `/restaurante/sabor-da-casa`
- Painel: `/admin/login` → entre com o usuário criado → Dashboard, Cardápio de hoje, Pratos salvos, Marmitas, Clientes, Personalização, Configurações
- Upload de foto em “Criar novo prato” (JPG/PNG/WEBP até 4 MB)

---

## Configurar o WhatsApp

No painel: **Configurações → WhatsApp dos pedidos** (ou Personalização). Use só dígitos com DDI+DDD, ex.: `5563999990000`. O número **não fica fixo no código** — o site lê do banco e gera o link `wa.me` com a mensagem montada pelo cliente.

---

## Build e deploy

```bash
npm run build    # gera dist/ (arquivos estáticos)
```

Hospede `dist/` em Vercel, Netlify, Cloudflare Pages, etc. O app usa **HashRouter** (`/#/admin`), então funciona **sem configuração de rewrite** em qualquer hospedagem estática. Se preferir URLs sem `#` (BrowserRouter), troque em `src/App.tsx` e configure o rewrite da hospedagem para `index.html`.

Variáveis no deploy: defina `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do provedor.

---

## Segurança — o que está implementado

O objetivo não é afirmar que é “impossível de hackear” — é aplicar as proteções corretas para este tipo de produto:

1. **Descobrir a URL ≠ ter acesso.** `/admin`, `/painel`, `/dashboard` etc. existem, mas sem sessão válida o painel nem carrega dados: redireciona para o login. Apelidos de rota são só conveniência de UX.
2. **Ver o código frontend ≠ acessar o banco.** O frontend só tem a chave `anon`. Todas as consultas passam pelo PostgREST com JWT da sessão.
3. **RLS por vínculo de restaurante.** Cada política exige: `usuário autenticado` **+** `membro do restaurante (restaurant_members)` **+** `registro com o mesmo restaurant_id`. Usuário sem vínculo não lê nem escreve nada.
4. **Alterar o frontend ≠ ignorar regras.** Tentar trocar `restaurant_id` no cliente é inútil: o banco rejeita (`with check`). Duplicar prato no mesmo dia é bloqueado pela constraint `UNIQUE`.
5. **Dados privados separados dos públicos.** `orders` e `customers` **não têm política para `anon`** — o site público nunca os consulta. Só são públicos: restaurante (dados do site), pratos e cardápio do dia (informação que o restaurante quer publicar).
6. **Sem segredos no código.** Nenhuma `service_role`, nenhuma senha fixa como proteção. Funções privilegiadas usam `security definer` pontuais (`my_restaurant_ids`, numeração de pedido), padrão Supabase.
7. **Storage protegido.** Upload apenas autenticado e somente dentro do caminho do próprio restaurante (`r/<restaurant_id>/...`).
8. **Sessão expirada?** O app detecta (Supabase refresh/`onAuthStateChanged`) e devolve ao login; a API responde com erro amigável.

> A senha demo em `demoStore.ts` só existe para o modo sem backend e está claramente documentada como demonstração.

---

## Checklist de testes

- [ ] Login funcionando (e mensagens amigáveis ao errar senha)
- [ ] Logout encerra a sessão; voltar para `/admin` sem sessão redireciona ao login
- [ ] Recarregar `/admin` sem login → login
- [ ] Autenticado sem vínculo → tela “Acesso negado”
- [ ] Site público não retorna pedidos/clientes (aba Network)
- [ ] RLS: consulta de outro restaurante retorna vazio/erro (testar com 2 usuários)
- [ ] Duplicar prato no mesmo dia → bloqueado no frontend **e** no banco (erro 23505 tratado)
- [ ] Upload: arquivo inválido/ > 4 MB → erro amigável; imagem válida → preview
- [ ] Campos obrigatórios validados (nome do prato, cliente da marmita, slug)
- [ ] Fluxo de status: Pendente → Preparando → Pronta → Entregue
- [ ] WhatsApp abre com a mensagem formatada e número configurável
- [ ] Personalização com prévia ao vivo; slug inválido/em uso rejeitado
- [ ] Responsivo: 320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440 px
- [ ] Navegação por teclado (Esc fecha modais, foco visível, labels nos campos)
- [ ] Estados: loading (skeletons), erro (tentar novamente) e vazio em todas as listas

---

## Estrutura do projeto

```
src/
  App.tsx                    # Rotas públicas + proteção do painel + apelidos
  index.css                  # Tema (Tailwind v4): cores, fontes, animações
  components/
    icons.tsx                # Ícones SVG próprios
    ui.tsx                   # Botões, campos, modais, badges, estados
    AdminLayout.tsx          # Sidebar/drawer do painel
    FoodModals.tsx           # Criar prato (foto) + escolher prato salvo
  context/providers.tsx      # Toast, Auth, hook de dados
  lib/
    supabase.ts              # Cliente Supabase + onde inserir credenciais
    api.ts                   # Facade: Supabase (real) ou demo (sem credenciais)
    demoStore.ts             # Banco local de demonstração + dados fictícios
    types.ts                 # Modelos (espelham as tabelas)
    utils.ts                 # Datas, BRL, WhatsApp, validações
  pages/
    LoginPage.tsx
    public/  HomePage · MenuPage · MarmitaPage
    admin/   Dashboard · TodayMenu · Library · Orders · Customers ·
             Customization · Settings
supabase/schema.sql          # Tabelas + RLS + índices + Storage (executar no Supabase)
.env.example                 # Onde colocar URL e anon key
```

## Multi-restaurante

A arquitetura é multi-tenant por `restaurant_id` + `slug`: cada restaurante tem site próprio em `/restaurante/<slug>`, seus pratos, pedidos, clientes e configurações — com o RLS garantindo o isolamento no banco.
