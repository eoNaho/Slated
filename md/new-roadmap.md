# PixelReel — Product Roadmap & Feature Specification

> Documento gerado em 19/03/2026. Cobre todos os sistemas planejados: premium, identidade, stories, bio e melhorias gerais.

---

## Índice

1. [Sistema de Planos e Premium](#1-sistema-de-planos-e-premium)
2. [Identidade de Perfil Premium](#2-identidade-de-perfil-premium)
    - [2.1 Moldura de Perfil (Frame)](#21-moldura- de-perfil-frame)
    - [2.2 Títulos de Perfil](#22-títulos-de-perfil)
    - [2.3 Badge de Apoiador](#23-badge-de-apoiador)
    - [2.4 Verificação de Conta](#24-verificação-de-conta)
    - [2.5 Customização de Estética (Cores e Temas)](#25-customização-de-estética-cores-e-temas)
    - [2.6 Bloco de Destaque (Featured Slot)](#26-bloco-de-destaque-featured-slot)
    - [2.7 Showcase de Badges](#27-showcase-de-badges)
    - [2.8 Reordenação de Layout](#28-reordenação-de-layout)
3. [Suporte a GIF para Usuários Premium](#3-suporte-a-gif-para-usuários-premium)
4. [Sistema de Bio Avançado](#4-sistema-de-bio-avançado)
5. [Capa Personalizada de Mídia](#5-capa-personalizada-de-mídia)
6. [Sistema de Stories](#6-sistema-de-stories)
7. [Admin Dashboard de Premium](#7-admin-dashboard-de-premium)
8. [Plano de Integração — Fases e Tarefas](#8-plano-de-integração--fases-e-tarefas)

---

## 1. Sistema de Planos e Premium

### 1.1 Filosofia

O sistema de premium do PixelReel é baseado em **valor percebido e identidade**, não em bloqueio de funcionalidades essenciais. Usuários free têm acesso pleno às funções core da plataforma (listas ilimitadas, favoritos, watchlist, diary, reviews). O premium entrega **expressão, status e personalização** — o que faz a assinatura ser desejada, não apenas necessária.

### 1.2 Tiers

| Feature | Free | Pro ($4.99/mês) | Ultra ($9.99/mês) |
|---|---|---|---|
| Listas | Ilimitadas | Ilimitadas | Ilimitadas |
| Favoritos | Ilimitados | Ilimitados | Ilimitados |
| Export CSV/JSON | — | Sim | Sim |
| Temas customizados | — | Sim | Sim |
| Analytics avançados | — | Sim | Sim |
| Import do Letterboxd | — | Sim | Sim |
| Moldura de perfil | — | Sim | Sim |
| Títulos de perfil | Básicos | Todos | Todos |
| Capa customizada de mídia | — | Sim | Sim |
| GIF em avatar/capa | — | — | Sim |
| Badge de apoiador | — | — | Sim |
| Verificação de conta | — | — | Sim |
| Stories fixados no perfil | 24h apenas | Fixar 3 | Fixar ilimitados |
| Suporte prioritário | — | Sim | Sim |
| Clubes criados | 3 | 10 | 20 |
| Membros por clube | 50 | 200 | 500 |

> **Nota:** A limitação de membros/clubes é a única restrição funcional. Todo o resto é identidade e expressão.

### 1.3 Preços Anuais

- Pro anual: **$49.99** (economia de ~17%)
- Ultra anual: **$99.99** (economia de ~17%)

### 1.4 Cupons e Promoções

O sistema suporta cupons integrados ao Stripe com:

- Desconto percentual ou fixo
- Limite de usos (ex: 100 usos)
- Data de expiração
- Aplicação por plano específico
- Geração de cupons de influencer (100% off, usos ilimitados)

---

## 2. Identidade de Perfil Premium

### 2.1 Moldura de Perfil (Frame)

Aro animado ou estático ao redor do avatar do usuário. Visível em **todo lugar** onde o avatar aparece: perfil, reviews, comentários, posts em clubes, listas.

**Frames disponíveis:**

| Slug | Nome | Descrição | Plano mínimo |
|---|---|---|---|
| `cinema` | Cinema | Aro roxo sólido | Pro |
| `noir` | Noir | Aro cinza escuro | Pro |
| `cult` | Cult | Aro coral/laranja | Pro |
| `golden-age` | Golden Age | Aro âmbar dourado | Pro |
| `sci-fi` | Sci-Fi | Aro azul animado | Pro |
| `horror` | Horror | Aro vermelho animado | Pro |
| `supporter` | Apoiador | Aro especial animado dourado | Ultra |
| `ultra` | Ultra | Aro premium exclusivo animado | Ultra |

**Schema — `profile_frames`:**

```sql
CREATE TABLE profile_frames (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  color      text NOT NULL,
  is_animated boolean DEFAULT false,
  min_plan   text NOT NULL DEFAULT 'pro', -- 'pro' | 'ultra'
  preview_url text,
  created_at timestamptz DEFAULT now()
);
```

**Schema — `user_identity_perks`:**

```sql
CREATE TABLE user_identity_perks (
  user_id        uuid PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  frame_id       uuid REFERENCES profile_frames(id) ON DELETE SET NULL,
  active_title_id uuid REFERENCES profile_titles(id) ON DELETE SET NULL,
  badge_enabled  boolean DEFAULT false,
  verified       boolean DEFAULT false,
  updated_at     timestamptz DEFAULT now()
);
```

### 2.2 Títulos de Perfil

Tag colorida exibida abaixo do username no perfil e ao lado do nome em reviews/comentários. Desbloqueáveis por **plano, XP ou achievements**.

**Títulos por plano:**

| Título | Cor | Fonte | Plano |
|---|---|---|---|
| Apoiador | Âmbar | Plano Pro | Pro |
| Ultra | Dourado | Plano Ultra | Ultra |
| Cinéfilo | Roxo | 1.000 XP | Free+ |
| Crítico | Azul | 50 reviews | Free+ |
| Maratonista | Teal | 500 filmes | Free+ |
| Cult Lord | Cinza escuro | Achievement específico | Pro+ |
| Diretor | Verde | 100 listas | Pro+ |
| Storyteller | Rosa | 50 stories publicados | Pro+ |
| Lendário | Âmbar especial | 10.000 XP | Ultra |

**Schema — `profile_titles`:**

```sql
CREATE TABLE profile_titles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  bg_color    text NOT NULL,
  text_color  text NOT NULL,
  source      text NOT NULL, -- 'plan' | 'xp' | 'achievement'
  min_plan    text,          -- null = free pode ter
  xp_required integer,
  achievement_id uuid REFERENCES achievements(id),
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE user_titles (
  user_id    uuid REFERENCES "user"(id) ON DELETE CASCADE,
  title_id   uuid REFERENCES profile_titles(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, title_id)
);
```

### 2.3 Badge de Apoiador

Ícone âmbar compacto exibido ao lado do username. Apenas Ultra. Aparece em:

- Página de perfil
- Cards de review
- Comentários em reviews e listas
- Posts e comentários em clubes
- Feed de atividades

### 2.4 Verificação de Conta

Check roxo permanente. Apenas Ultra. Diferencia criadores de conteúdo, críticos e apoiadores fiéis da plataforma.

**Regras:**
- Atribuído automaticamente ao assinar Ultra
- Mantido enquanto a assinatura estiver ativa
- Admin pode revogar manualmente
- Visível em todo lugar que o username aparecer

### 2.5 Customização de Estética (Cores e Temas)

Permitir que o usuário escolha a identidade visual do seu perfil através de cores e temas pré-definidos.

#### 2.5.1 Cores de Destaque (Accent Colors)
Usuário escolhe uma cor principal (hex ou paleta) que define:
- **Impacto**: Botões primários, indicadores de tabs ativas, bordas de avatares e efeitos de hover.
- **Premium (Ultra)**: Efeito de "Glow" (brilho neon) atrás do avatar ou banner usando a cor escolhida.

#### 2.5.2 Temas de Perfil (Profile Skins)
Presets visuais que alteram o CSS do perfil (Pro/Ultra).
- **Cinema Noir**: Alto contraste, p&b com granulação fina.
- **Vaporwave**: Gradientes rosa/azul e estética retrô.
- **Midnight**: Tons de azul profundo e interfaces semi-transparentes.
- **Old School**: Estética de interface de sistemas antigos (MS-DOS, Windows 95).

### 2.6 Bloco de Destaque (Featured Slot)

Um espaço de destaque no topo do perfil, logo abaixo do cabeçalho, onde o usuário escolhe o que é mais importante exibir (Pro/Ultra).

- **Review em Destaque**: Fixar uma crítica específica bem avaliada.
- **Lista Curada**: Exibir uma coleção específica (ex: "Meus filmes favoritos de terror").
- **Top 5 (Ampliado)**: Uma fileira horizontal com os 5 filmes favoritos (atualmente são apenas 4).
- **Milestone Showcase**: Exibir o marco de conquista mais difícil/raro de obter.

### 2.7 Showcase de Badges

Exibir conquistas diretamente no cabeçalho do perfil para reconhecimento imediato.
- **Implementação**: Usuário seleciona até **3 insígnias (badges)** desbloqueadas para fixar ao lado do nome ou abaixo da bio.
- **Sincronização**: Integrado ao sistema de `achievements` já existente.

### 2.8 Reordenação de Layout

Dar ao usuário o controle sobre a ordem das seções do perfil (Pro/Ultra).
- **Exemplo**: O usuário pode preferir que o "Diário" apareça antes das "Listas", ou que a "Atividade Recente" seja o primeiro item.
- **Técnico**: Salvar um JSON `layout_config` nas configurações do usuário.

---

## 3. Suporte a GIF para Usuários Premium

### 3.1 Escopo

Usuários **Ultra** podem fazer upload de GIFs animados nos seguintes contextos:

| Contexto | Quem pode | Formato aceito | Tamanho máx |
|---|---|---|---|
| Avatar de perfil | Ultra | GIF, WEBP, JPG, PNG | 5 MB |
| Capa de perfil (banner) | Ultra | GIF, WEBP, JPG, PNG | 10 MB |
| Avatar do clube | Dono Ultra | GIF, WEBP, JPG, PNG | 5 MB |
| Capa do clube | Dono/Mod Ultra | GIF, WEBP, JPG, PNG | 10 MB |

Usuários Free e Pro recebem apenas JPG, PNG e WEBP estático.

### 3.2 Processamento

- GIFs são armazenados no B2 bucket em formato original
- Versão estática (primeiro frame como WEBP) gerada automaticamente para fallback
- O `storageService.uploadAvatar()` e `uploadCover()` precisam de branch por tipo de arquivo
- Thumbnails de preview no admin e em cards pequenos usam sempre o frame estático

### 3.3 Validação no Backend

```typescript
// Lógica de validação de upload com gate GIF
async function validateImageUpload(file: File, user: User, context: 'avatar' | 'cover' | 'club_avatar' | 'club_cover') {
  const isGif = file.type === 'image/gif';
  
  if (isGif && user.role !== 'ultra' && !user.isPremium) {
    return { allowed: false, error: 'GIFs animados são exclusivos do plano Ultra', upgrade: true };
  }
  
  const maxSizes = {
    avatar: 5 * 1024 * 1024,
    cover: 10 * 1024 * 1024,
    club_avatar: 5 * 1024 * 1024,
    club_cover: 10 * 1024 * 1024,
  };
  
  if (file.size > maxSizes[context]) {
    return { allowed: false, error: `Arquivo muito grande para ${context}` };
  }
  
  return { allowed: true };
}
```

### 3.4 Renderização no Frontend

- Componente `<FramedAvatar>` renderiza `<img>` com `src` do avatar — o browser anima GIF automaticamente
- Para contextos de performance (listas densas, feeds), usar `loading="lazy"` e considerar pausa via `Intersection Observer`
- CTA de upgrade aparece quando usuário Free/Pro tenta fazer upload de GIF

---

## 4. Sistema de Bio Avançado

### 4.1 Visão Geral

A bio atual é um campo de texto simples. O sistema avançado transforma o perfil em uma **página rica de identidade cinematográfica**, com seções estruturadas e blocos de expressão.

### 4.2 Campos da Bio Expandida

**Schema — adicionar ao `user`:**

```sql
ALTER TABLE "user" ADD COLUMN bio_extended jsonb;
-- Estrutura do jsonb:
-- {
--   "headline": "Cinéfilo nato. Reviews que ninguém pediu.",
--   "location": "São Paulo, BR",
--   "website": "https://...",
--   "links": [{ "label": "Letterboxd", "url": "..." }],
--   "quote": { "text": "...", "author": "...", "source": "..." },
--   "moods": ["noir", "sci-fi", "drama"],
--   "currently_watching": { "media_id": "...", "note": "..." },
--   "sections": [{ "title": "...", "content": "..." }]
-- }
```

### 4.3 Componentes da Bio

#### 4.3.1 Headline

Frase curta de até 120 caracteres. Aparece em destaque abaixo do username. Suporta os mesmos caracteres especiais do Twitter/Instagram. Exemplo: *"Lynch enthusiast. 847 filmes. Reviews que ninguém pediu."*

#### 4.3.2 Links Personalizados

Até 3 links externos com label customizável (Free) ou ilimitados (Pro/Ultra). Renderizados como pills clicáveis no perfil.

```typescript
interface BioLink {
  label: string;   // "Letterboxd", "IMDb", "Meu blog"
  url: string;     // https://...
  icon?: string;   // 'letterboxd' | 'imdb' | 'link' | 'twitter' etc
}
```

#### 4.3.3 Citação Favorita

Um bloco de citação de filme ou diretor. Campo estruturado com texto, autor e fonte (filme/livro).

```
"O cinema é um espelho que se transforma em martelo."
— Andrei Tarkovski
```

Visível no perfil como blockquote estilizado. Apenas Pro/Ultra.

#### 4.3.4 Humor Cinematográfico (Moods)

Tags visuais que expressam o gosto do usuário. Seleção de até 5 tags de uma lista curada:

`noir` `sci-fi` `drama` `horror` `comédia` `cult` `anime` `documentário` `musical` `faroeste` `thriller` `romance` `ação` `terror` `animação` `fantasia` `crime` `arte & ensaio` `silent film` `world cinema`

Renderizadas como pills coloridas no perfil. Clicáveis para filtrar por mood na busca.

#### 4.3.5 Assistindo Agora

Destaque manual de uma mídia que o usuário está assistindo no momento. Mostra o poster + nota curta. Diferente do diary (que é log histórico), este é um status ativo que o usuário atualiza voluntariamente.

```typescript
interface CurrentlyWatching {
  media_id: string;
  note?: string;        // até 100 chars
  started_at: string;   // ISO date
  progress?: number;    // 0-100 para séries (% de episódios)
}
```

#### 4.3.6 Seções Customizadas (Pro/Ultra)

Blocos de texto livre com título + conteúdo. Até 3 seções (Pro) ou ilimitadas (Ultra). Markdown simplificado suportado (bold, itálico, links). Casos de uso:

- "Minha história com o cinema"
- "Diretores favoritos"
- "Por que assisto o que assisto"
- "Filmes que me formaram"

#### 4.3.7 Estatísticas em Destaque

Seção automática gerada a partir do histórico do usuário:

- Total de filmes assistidos
- Horas totais de cinema
- Nota média dada
- Gênero mais assistido
- Diretor mais assistido
- Ano de lançamento favorito (média ponderada)
- País de origem favorito

Visíveis no perfil de todos os usuários com histórico suficiente.

#### 4.3.8 Favoritos Expandidos (Pro/Ultra)

Além dos 4 filmes favoritos padrão, usuários Pro/Ultra podem ter seções adicionais de favoritos:

- **Séries favoritas** — grade separada de 4 séries
- **Diretores favoritos** — até 4 diretores com foto e nome
- **Anos favoritos** — até 3 décadas/anos destacados

### 4.4 Editor de Bio

Tela `/settings/profile` redesenhada com:

- Formulário por seção (não um campo texto único)
- Preview em tempo real ao lado
- Drag-and-drop para reordenar seções customizadas
- Contador de caracteres por campo
- CTA de upgrade inline nos campos exclusivos Pro/Ultra

### 4.5 Rendering no Perfil

A página de perfil pública exibe a bio expandida com:

- Layout responsivo: 2 colunas em desktop (bio à esquerda, stats à direita), 1 coluna mobile
- Seções colapsáveis em mobile para não sobrecarregar
- Moods como pills no topo, abaixo do avatar
- Citação em destaque se preenchida
- Links como row de pills clicáveis
- "Assistindo agora" como card pequeno com poster

---

## 5. Capa Personalizada de Mídia

### 5.1 Conceito

Em vez do poster oficial do TMDB, o usuário Pro/Ultra pode definir uma **imagem alternativa** para um filme ou série no contexto do seu próprio perfil. Isso aparece:

- Na grade de favoritos do perfil
- Em cards de filmes dentro das listas do usuário
- No diary do usuário

Não afeta outros usuários — cada pessoa vê sua própria capa ou o padrão.

### 5.2 Casos de Uso

- Usar um still alternativo preferido ao invés do poster
- Arte de fã (fan art)
- Poster de lançamento específico de um país
- Versão em preto e branco de um film noir

### 5.3 Schema

```sql
CREATE TABLE media_custom_covers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES "user"(id) ON DELETE CASCADE NOT NULL,
  media_id    uuid REFERENCES media(id) ON DELETE CASCADE NOT NULL,
  image_path  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, media_id)
);

CREATE INDEX idx_custom_covers_user ON media_custom_covers(user_id);
CREATE INDEX idx_custom_covers_media ON media_custom_covers(media_id);
```

### 5.4 Endpoints

```
POST   /api/v1/media/:id/custom-cover    — upload da capa (gate Pro+)
DELETE /api/v1/media/:id/custom-cover    — remove capa customizada
GET    /api/v1/users/:username/covers    — lista todas as capas do usuário
```

### 5.5 Lógica de Resolução

```typescript
// Ao renderizar qualquer card de mídia no contexto do usuário
function resolveMediaCover(mediaId: string, userId: string | null): string {
  if (!userId) return getDefaultCover(mediaId);
  const custom = await db.query.media_custom_covers.findFirst({
    where: and(eq(mediaId), eq(userId))
  });
  return custom?.image_path 
    ? storageService.getImageUrl(custom.image_path) 
    : getDefaultCover(mediaId);
}
```

---

## 6. Sistema de Stories

### 6.1 Conceito

Stories no PixelReel são diferentes do Instagram — são nativamente sobre **cinema e séries**, não sobre a vida do usuário. Cada story é um conteúdo estruturado ligado a uma mídia, lista ou opinião cinematográfica.

**Regras gerais:**
- Duração: 24 horas por padrão
- Visibilidade: apenas seguidores (ou público se perfil aberto)
- Free: stories somem após 24h, sem fixação
- Pro: pode fixar até 3 stories no perfil permanentemente
- Ultra: fixação ilimitada

### 6.2 Tipos de Story

#### 6.2.1 Assistindo Agora (`type: 'watch'`)

Gerado automaticamente como draft quando o usuário loga no diary. Usuário confirma antes de publicar.

```typescript
interface WatchStoryContent {
  media_id: string;
  media_title: string;
  poster_path: string;
  note?: string;        // até 140 chars
  rating?: number;      // nota opcional
  is_rewatch?: boolean;
}
```

Renderização: poster 2:3 com overlay escuro, nota curta, botões "Responder" e "+ Watchlist" para seguidores.

#### 6.2.2 Recomendação de Lista (`type: 'list'`)

Usuário compartilha uma lista como story. Seguidores veem carrossel de posters + comentário do criador.

```typescript
interface ListStoryContent {
  list_id: string;
  list_name: string;
  note?: string;
  poster_paths: string[];  // até 6 posters para preview
}
```

#### 6.2.3 Rating Interativo (`type: 'rating'`)

Rating rápido com estrelas + texto. Seguidores podem votar a própria nota inline sem sair do story viewer.

```typescript
interface RatingStoryContent {
  media_id: string;
  media_title: string;
  rating: number;      // 0.5-5
  text?: string;       // até 200 chars
  allow_reactions: boolean;
}
```

Interação: ao ver o story, seguidor vê as estrelas do autor + caixa para dar a própria nota. Cria micro-review linkada ao story original.

#### 6.2.4 Poll — Vote no que assisto (`type: 'poll'`)

2 a 4 opções de filmes ou séries em votação. Seguidores votam em 24h. Criador vê resultado em tempo real.

```typescript
interface PollStoryContent {
  question?: string;    // "Qual assisto hoje?"
  options: Array<{
    text: string;
    media_id?: string;
    poster_path?: string;
  }>;                   // 2-4 opções
  expires_at: string;   // ISO — geralmente 24h
}
```

Ao encerrar, sistema gera automaticamente um story de resultado com o vencedor.

#### 6.2.5 Hot Take (`type: 'hot_take'`)

Opinião impopular ou provocativa. Seguidores concordam ou discordam. Alta taxa de engajamento por debate.

```typescript
interface HotTakeContent {
  statement: string;    // "Acho que Pulp Fiction é superestimado"
  media_id?: string;    // filme referenciado (opcional)
  allow_debate: boolean;
}
```

Reações binárias: Concordo / Discordo. Percentual visível após votar. Comentários habilitados automaticamente.

#### 6.2.6 Rewind Diário (`type: 'rewind'`)

Gerado **automaticamente** pelo sistema ao final do dia quando o usuário logou alguma mídia no diary. Sem necessidade de ação do usuário.

```typescript
interface RewindContent {
  date: string;
  media_watched: Array<{
    media_id: string;
    title: string;
    poster_path: string;
    rating?: number;
  }>;
  total_runtime_mins: number;
  average_rating: number;
  generated_caption: string;  // "Bom dia de cinema"
}
```

O usuário pode optar por não publicar (notificação com preview antes de ir ao ar).

### 6.3 Schema de Banco de Dados

```sql
CREATE TABLE stories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES "user"(id) ON DELETE CASCADE NOT NULL,
  type          text NOT NULL, -- watch|list|rating|poll|hot_take|rewind
  content       jsonb NOT NULL,
  is_pinned     boolean DEFAULT false,
  is_expired    boolean DEFAULT false,
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  views_count   integer DEFAULT 0,
  reactions_count integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE story_views (
  story_id    uuid REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id   uuid REFERENCES "user"(id) ON DELETE CASCADE,
  viewed_at   timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE story_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES "user"(id) ON DELETE CASCADE,
  reaction     text NOT NULL,  -- 'agree' | 'disagree' | emoji para outros tipos
  text_reply   text,           -- resposta de texto opcional (vira notificação)
  created_at   timestamptz DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE TABLE story_poll_votes (
  story_id     uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES "user"(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

CREATE INDEX idx_stories_user       ON stories(user_id, expires_at);
CREATE INDEX idx_stories_feed       ON stories(expires_at, is_expired);
CREATE INDEX idx_story_views_story  ON story_views(story_id);
CREATE INDEX idx_story_reactions    ON story_reactions(story_id);
```

### 6.4 Endpoints

```
POST   /api/v1/stories                     — criar story
GET    /api/v1/stories/feed                — stories de quem sigo (não expirados)
GET    /api/v1/stories/user/:username      — stories públicos de um perfil
GET    /api/v1/stories/:id                 — story individual com stats
DELETE /api/v1/stories/:id                 — deletar (apenas dono)
POST   /api/v1/stories/:id/view            — registrar visualização
POST   /api/v1/stories/:id/react           — reagir (emoji/concordar/votar)
POST   /api/v1/stories/:id/poll-vote       — votar no poll
PATCH  /api/v1/stories/:id/pin             — fixar/desfixar (gate Pro+)
```

### 6.5 Automações

**Cron — Expiração de stories:**
```
Frequência: a cada 1 hora
Ação: UPDATE stories SET is_expired = true WHERE expires_at < now() AND is_pinned = false
```

**Cron — Rewind diário:**
```
Frequência: 23:00 por fuso horário do usuário (ou 23:00 UTC como simplificação)
Condição: usuário logou >= 1 mídia no diary hoje
Ação: montar content json, criar story com type='rewind', enviar notificação para confirmar
```

**Hook — Draft automático de story ao logar no diary:**
```
Trigger: INSERT em diary
Ação: criar story rascunho (is_draft: true) e notificar usuário para publicar
```

---

## 7. Admin Dashboard de Premium

### 7.1 Visão Geral

Interface em `/admin/premium` com controle total sobre planos, features e usuários em tempo real. Mudanças refletem imediatamente via Redis cache — sem deploy ou restart necessário.

### 7.2 Abas do Dashboard

#### 7.2.1 Planos e Limites

Edição inline de:
- Preços mensais e anuais por plano
- Limites numéricos (membros por clube, clubes criados)
- Ativar/desativar plano

Alterações em limites aplicam imediatamente. Alterações de preço requerem atualização manual no Stripe também.

#### 7.2.2 Feature Flags

Toggle por plano para cada feature. Cada flag é uma linha com toggles Free / Pro / Ultra.

**Features controladas por flag:**

| Feature key | Descrição |
|---|---|
| `export_data` | Export CSV/JSON do histórico |
| `custom_themes` | Temas de UI customizados |
| `advanced_analytics` | Analytics detalhados |
| `letterboxd_import` | Import do CSV do Letterboxd |
| `profile_frames` | Molduras de perfil |
| `custom_media_cover` | Capa customizada de mídia |
| `gif_uploads` | Upload de GIFs animados |
| `supporter_badge` | Badge de apoiador |
| `account_verified` | Check de verificação |
| `story_pin` | Fixar stories no perfil |
| `bio_sections` | Seções customizadas na bio |
| `bio_quote` | Citação favorita na bio |
| `bio_extended_favorites` | Favoritos expandidos |
| `priority_support` | Tag de suporte prioritário |

#### 7.2.3 Gerenciar Usuários

Busca por username com:
- Ver plano atual
- Alterar plano manualmente (para influencers, correções de bug, etc)
- Ver detalhes de atividade
- Revogar verificação

#### 7.2.4 Cupons

Listagem de cupons ativos com:
- Código, desconto, plano, usos, validade
- Criar novo cupom (integrado ao Stripe)
- Desativar cupom

### 7.3 Schema de Feature Flags

```sql
CREATE TABLE plan_feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key text NOT NULL,
  plan        text NOT NULL,  -- 'free' | 'pro' | 'ultra'
  enabled     boolean DEFAULT false,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (feature_key, plan)
);
```

### 7.4 Middleware de Gate

```typescript
// src/lib/featureGate.ts

// Cache em memória com invalidação via Redis pub/sub
let flagCache: Record<string, Record<string, boolean>> = {};

export async function checkFeature(user: User, featureKey: string): Promise<boolean> {
  const plan = getUserPlan(user); // 'free' | 'pro' | 'ultra'
  
  if (!flagCache[featureKey]) {
    await reloadFlags(featureKey);
  }
  
  return flagCache[featureKey]?.[plan] ?? false;
}

export async function checkLimit(user: User, limitKey: string): Promise<{ allowed: boolean; limit: number }> {
  const tier = getUserPlan(user);
  const limits = await getLimits(tier);
  return { allowed: true, limit: limits[limitKey] };
}
```

---

## 8. Plano de Integração — Fases e Tarefas

### Fase 1 — Fundação do banco de dados
**Estimativa:** ~1 dia | **Dependência:** nenhuma

Todas as fases dependem desta. Deve ser executada primeiro.

**Tarefas:**

- [ ] `[DB]` Tabela `user_identity_perks` — frame_id, active_title_id, badge_enabled, verified
- [ ] `[DB]` Tabela `profile_frames` — id, name, slug, color, is_animated, min_plan, preview_url
- [ ] `[DB]` Tabela `profile_titles` — id, name, slug, bg_color, text_color, source, min_plan, xp_required
- [ ] `[DB]` Tabela `user_titles` — user_id, title_id, unlocked_at
- [ ] `[DB]` Tabela `media_custom_covers` — id, user_id, media_id, image_path
- [ ] `[DB]` Tabela `stories` — id, user_id, type, content (jsonb), expires_at, is_pinned, is_expired, views_count
- [ ] `[DB]` Tabela `story_views` — story_id, viewer_id, viewed_at
- [ ] `[DB]` Tabela `story_reactions` — story_id, user_id, reaction, text_reply
- [ ] `[DB]` Tabela `story_poll_votes` — story_id, user_id, option_index
- [ ] `[DB]` Tabela `plan_feature_flags` — feature_key, plan, enabled
- [ ] `[DB]` Alterar `"user_settings"` — adicionar `accent_color`, `profile_theme`, `layout_config` (jsonb), `showcased_badges` (jsonb)
- [ ] `[DB]` Alterar `"user"` — adicionar coluna `bio_extended jsonb`
- [ ] `[DB]` Indexes: `stories(user_id, expires_at)`, `story_views(story_id)`, `user_identity_perks(user_id)`
- [ ] `[DB]` Seed de frames padrão (cinema, noir, cult, golden-age, sci-fi, horror, supporter, ultra)
- [ ] `[DB]` Seed de títulos padrão (apoiador, ultra, cinéfilo, crítico, maratonista, cult lord, etc)
- [ ] `[DB]` Seed de feature flags com valores iniciais por plano

---

### Fase 2 — Sistema de identidade premium
**Estimativa:** ~3 dias | **Dependência:** Fase 1

- [ ] `[API]` `GET /api/v1/identity/me` — retorna frame, título ativo, badge, verified
- [ ] `[API]` `GET /api/v1/identity/frames` — lista frames com `is_unlocked` calculado por plano
- [ ] `[API]` `GET /api/v1/identity/titles` — lista títulos com `is_unlocked` e `source`
- [ ] `[API]` `PATCH /api/v1/identity/frame` — atualiza frame ativo (gate Pro+)
- [ ] `[API]` `PATCH /api/v1/identity/title` — ativa título já desbloqueado
- [ ] `[API]` `POST /api/v1/identity/titles/:id/unlock` — lógica de desbloqueio por XP/achievement/plano
- [ ] `[API]` Hook no evento de assinatura: desbloquear títulos e frames do plano automaticamente
- [ ] `[API]` Incluir objeto `identity` no `GET /users/:username` e `GET /users/me`
- [ ] `[API]` Incluir identity resumida (frame + title + badge + verified) em reviews, comments, posts
- [ ] `[Frontend]` Componente `<FramedAvatar>` — avatar com frame, suporte a animated (gif/css)
- [ ] `[Frontend]` Componente `<TitleBadge>` — tag colorida com nome do título
- [ ] `[Frontend]` Componente `<SupporterBadge>` — dot âmbar + "Apoiador"
- [ ] `[Frontend]` Componente `<VerifiedBadge>` — check roxo compacto
- [ ] `[Frontend]` Tela `/settings/identity` com preview ao vivo (frame + título + badge)
- [ ] `[Frontend]` Galeria de frames com lock/unlock visual e CTA de upgrade
- [ ] `[Frontend]` Galeria de títulos filtrada por source e com progresso de desbloqueio
- [ ] `[Frontend]` Interface de seleção de **accent color** e **glow effect** (Ultra)
- [ ] `[Frontend]` Seletor de **profile skins** (temas premium)
- [ ] `[Frontend]` Interface de **Showcase de Badges** (seleção de até 3)

---

### Fase 3 — Bio avançada
**Estimativa:** ~3 dias | **Dependência:** Fase 1

- [ ] `[API]` `PATCH /api/v1/users/me/bio` — atualiza campos do `bio_extended` com validação por campo
- [ ] `[API]` `GET /users/:username` — incluir `bio_extended` na resposta pública
- [ ] `[API]` Gate por campo: seções customizadas e citação exigem Pro+, links ilimitados exigem Pro+
- [ ] `[API]` Validação: headline max 120 chars, links max URL 300 chars, seções max 500 chars cada
- [ ] `[API]` Endpoint `PATCH /users/me/currently-watching` — atualiza campo `currently_watching` do bio
- [ ] `[API]` Geração automática de estatísticas de perfil: gênero mais assistido, diretor, etc
- [ ] `[Frontend]` Redesign de `/settings/profile` — formulário por seção com preview ao vivo
- [ ] `[Frontend]` Seção Headline — input com contador de 120 chars
- [ ] `[Frontend]` Seção Links — até 3 free, ilimitado Pro+, com selector de ícone
- [ ] `[Frontend]` Seção Citação — campos texto + autor + fonte (gate Pro+)
- [ ] `[Frontend]` Seção Moods — selector de até 5 tags de lista curada
- [ ] `[Frontend]` Seção "Assistindo agora" — busca de mídia + nota curta
- [ ] `[Frontend]` Seções customizadas — editor com markdown lite, drag-and-drop para reordenar (Pro+)
- [ ] `[Frontend]` Componente de bio no perfil público — layout 2 colunas desktop, responsivo
- [ ] `[Frontend]` Stats automáticas do perfil — horas, nota média, gênero favorito, diretor favorito
- [ ] `[Frontend]` Favoritos expandidos no perfil — séries e diretores favoritos (Pro/Ultra)
- [ ] `[Frontend]` Mockup e implementação do **Featured Slot** modular
- [ ] `[Frontend]` Sistema de drag-and-drop para **reordenação total de layout** (layout_config)

---

### Fase 4 — Suporte a GIF
**Estimativa:** ~1 dia | **Dependência:** Fase 1

- [ ] `[API]` Atualizar `storageService.uploadAvatar()` para aceitar GIF e salvar sem reprocessar
- [ ] `[API]` Atualizar `storageService.uploadCover()` idem
- [ ] `[API]` Gerar fallback estático (primeiro frame → WEBP) para todo GIF enviado
- [ ] `[API]` Gate em `POST /users/me/avatar` e `/cover` — GIF exige plano Ultra
- [ ] `[API]` Gate em `POST /clubs/:id/cover` e avatar do clube — dono/mod deve ser Ultra
- [ ] `[API]` Validação: GIF máx 5MB (avatar), 10MB (cover)
- [ ] `[Frontend]` Aceitar `image/gif` nos file inputs quando usuário é Ultra
- [ ] `[Frontend]` Preview do GIF animado antes de confirmar upload
- [ ] `[Frontend]` Fallback para frame estático em contextos de lista densa (performance)
- [ ] `[Frontend]` CTA de upgrade inline quando Free/Pro tenta subir GIF

---

### Fase 5 — Capa personalizada de mídia
**Estimativa:** ~2 dias | **Dependência:** Fase 1

- [ ] `[API]` `POST /api/v1/media/:id/custom-cover` — upload (gate Pro+), salva no B2
- [ ] `[API]` `DELETE /api/v1/media/:id/custom-cover` — remove capa do usuário para aquela mídia
- [ ] `[API]` `GET /api/v1/users/:username/covers` — lista capas customizadas públicas
- [ ] `[API]` Função `resolveMediaCover(mediaId, userId)` — prioriza custom cover, fallback TMDB
- [ ] `[API]` Incluir resolução de custom cover em: favoritos, listas do usuário, diary
- [ ] `[Frontend]` Componente `<MediaCard>` com suporte a `customCover` prop + fallback
- [ ] `[Frontend]` Botão "Trocar capa" na página de detalhe de filme (visível só para Pro/Ultra autenticados)
- [ ] `[Frontend]` Modal de upload com crop forçado 2:3 (aspect ratio do poster)
- [ ] `[Frontend]` Preview antes de confirmar com comparação lado a lado (original × custom)

---

### Fase 6 — Admin dashboard e feature flags
**Estimativa:** ~2 dias | **Dependência:** Fase 1

- [ ] `[API]` `GET /api/v1/admin/plans` — lista planos com limites
- [ ] `[API]` `PATCH /api/v1/admin/plans/:id/limits` — atualiza limites, invalida cache Redis
- [ ] `[API]` `GET /api/v1/admin/feature-flags` — lista todas as flags
- [ ] `[API]` `PATCH /api/v1/admin/feature-flags/:key` — toggle por plano, invalida cache
- [ ] `[API]` `PATCH /api/v1/admin/users/:id/plan` — altera plano manualmente
- [ ] `[API]` `GET /api/v1/admin/coupons` + `POST` — gerenciamento via Stripe API
- [ ] `[API]` Middleware `checkFeature(user, key)` — consulta Redis-cached flags
- [ ] `[API]` Middleware `checkLimit(user, key)` — para limites de membros, clubes
- [ ] `[Frontend]` Dashboard `/admin/premium` com 4 abas: Planos, Feature Flags, Usuários, Cupons
- [ ] `[Frontend]` Inputs inline editáveis nos limites com save via PATCH
- [ ] `[Frontend]` Toggles por plano para cada feature flag
- [ ] `[Frontend]` Busca e edição de plano de usuário individual
- [ ] `[Frontend]` Listagem e criação de cupons

---

### Fase 7 — Infraestrutura de stories
**Estimativa:** ~3 dias | **Dependência:** Fase 1

- [ ] `[API]` `POST /api/v1/stories` — cria story com type-schema validado
- [ ] `[API]` `GET /api/v1/stories/feed` — stories de quem sigo, não expirados, ordenado
- [ ] `[API]` `GET /api/v1/stories/user/:username` — stories públicos de um perfil
- [ ] `[API]` `GET /api/v1/stories/:id` — story com views e reações
- [ ] `[API]` `DELETE /api/v1/stories/:id` — apenas dono
- [ ] `[API]` `POST /api/v1/stories/:id/view` — registra view (dedup por user)
- [ ] `[API]` `POST /api/v1/stories/:id/react` — emoji/concordar/responder
- [ ] `[API]` `POST /api/v1/stories/:id/poll-vote` — votar no poll
- [ ] `[API]` `PATCH /api/v1/stories/:id/pin` — fixar/desfixar (gate Pro+)
- [ ] `[Automação]` Cron de expiração: `UPDATE stories SET is_expired=true WHERE expires_at < now()`
- [ ] `[Automação]` Cron Rewind diário às 23h UTC — detectar diary do dia, montar content, criar draft
- [ ] `[Automação]` Hook no diary INSERT — criar story draft automático tipo 'watch' e notificar
- [ ] `[Frontend]` Componente `<StoryRing>` — avatar com aro colorido se tem story não visto
- [ ] `[Frontend]` Componente `<StoryViewer>` — modal fullscreen com barra de progresso e navegação
- [ ] `[Frontend]` Barra de stories no topo do feed — scroll horizontal com avatars
- [ ] `[Frontend]` Stories fixados no topo da página de perfil do usuário

---

### Fase 8 — Tipos de story
**Estimativa:** ~4 dias | **Dependência:** Fase 7

- [ ] `[API]` Schema de validação por type (zod schemas para cada `content` jsonb)
- [ ] `[API]` `[watch]` Processar draft automático vindo do diary hook
- [ ] `[API]` `[list]` Resolver posters da lista ao criar story tipo list
- [ ] `[API]` `[rating]` Endpoint para seguidor votar nota inline no story
- [ ] `[API]` `[poll]` Calcular e retornar percentuais ao votar
- [ ] `[API]` `[poll]` Gerar story de resultado automático ao expirar poll
- [ ] `[API]` `[hot_take]` Agregar votos Concordo/Discordo e percentuais
- [ ] `[API]` `[rewind]` Job: agregar diary do dia, calcular stats, gerar caption, criar story
- [ ] `[Frontend]` Creator UI — modal "Criar story" com selector de tipo e form dinâmico por tipo
- [ ] `[Frontend]` `[watch]` Template: poster 2:3 + overlay + nota + CTA de watchlist
- [ ] `[Frontend]` `[list]` Carrossel de posters + texto + CTA para lista
- [ ] `[Frontend]` `[rating]` Estrelas do autor + input de estrelas para seguidor
- [ ] `[Frontend]` `[poll]` Opções com barras de percentual após votar
- [ ] `[Frontend]` `[hot_take]` Botões Concordo/Discordo com % ao vivo
- [ ] `[Frontend]` `[rewind]` Grid de posters + stats de tempo e nota média

---

### Fase 9 — Notificações e integração cross-sistema
**Estimativa:** ~2 dias | **Dependência:** Fases 2, 7 e 8

- [ ] `[API]` Implementar `GET /api/v1/notifications` com paginação (placeholder existe, precisa funcionar)
- [ ] `[API]` `PATCH /api/v1/notifications/read-all`
- [ ] `[API]` Notificação: alguém reagiu ao seu story
- [ ] `[API]` Notificação: alguém votou no seu poll
- [ ] `[API]` Notificação: alguém concordou/discordou do hot take
- [ ] `[API]` Notificação: novo story de alguém que você segue (throttled, máx 1/dia por usuário)
- [ ] `[API]` XP ao criar story (5 XP)
- [ ] `[API]` XP ao receber 10 reações em um story (20 XP)
- [ ] `[API]` Achievement: "Streaker" — story publicado 7 dias seguidos
- [ ] `[API]` Achievement: "Influencer" — 100 reações em stories acumuladas
- [ ] `[API]` Achievement: "Hot Taker" — 10 hot takes publicados
- [ ] `[API]` Título desbloqueável: "Storyteller" ao publicar 50 stories
- [ ] `[API]` Desbloquear título "Cinéfilo" ao atingir 1.000 XP
- [ ] `[API]` Desbloquear título "Maratonista" ao registrar 500 filmes no diary
- [ ] `[API]` Desbloquear título "Crítico" ao publicar 50 reviews
- [ ] `[Frontend]` Badge de contagem de notificações não lidas no header
- [ ] `[Frontend]` Tela `/notifications` com lista paginada e ações rápidas
- [ ] `[Frontend]` Toast de achievement desbloqueado (aparece no canto após ação)

---

## Resumo Geral

| Fase | Escopo | Est. | Tipo |
|---|---|---|---|
| 1 — DB | Schema, migrations, seeds | ~1 dia | DB |
| 2 — Identidade | Frames, títulos, badge, verified | ~3 dias | API + Frontend |
| 3 — Bio avançada | Todos os campos de bio | ~3 dias | API + Frontend |
| 4 — GIF | Suporte a GIF animado | ~1 dia | API + Frontend |
| 5 — Custom cover | Capa personalizada de mídia | ~2 dias | API + Frontend |
| 6 — Admin dashboard | Flags, planos, cupons | ~2 dias | API + Frontend |
| 7 — Stories core | Infraestrutura e CRUD | ~3 dias | API + Frontend + Cron |
| 8 — Story types | 6 tipos com UI própria | ~4 dias | API + Frontend + Cron |
| 9 — Notificações | Cross-sistema, XP, achievements | ~2 dias | API + Frontend |
| **Total** | **87 tarefas** | **~21 dias** | |

**Ordem recomendada de execução:** 1 → 2 + 3 + 6 (paralelo) → 4 + 5 (paralelo) → 7 → 8 → 9

---

*PixelReel — Documento interno de produto. Atualizado em 19/03/2026.*