# Watch Party — Plano de Implementacao

## Contexto

O PixelReel ja tem Activity Tracking e Scrobbles completos (extensao + backend + frontend). A proxima feature e o **Watch Party**: salas onde usuarios sincronizam video (play/pause/seek) e conversam via chat em tempo real enquanto assistem na Netflix, Disney+, Max ou Prime Video.

O backend usa **Elysia** (que tem WebSocket nativo via `app.ws()`) e **Bun**. Redis e Upstash HTTP-only (sem Pub/Sub), entao salas ficam in-memory. A extensao e Manifest V3 com content scripts por plataforma e um service worker central.

---

## Arquitetura Geral

```
Extension (content script)          Extension (service worker)           Backend (Elysia)
┌─────────────────────┐     chrome.runtime     ┌──────────────────┐      WebSocket       ┌──────────────────┐
│ watch-party-sync.js │ ◄──────────────────────►│ service-worker.js│ ◄───────────────────►│ app.ws() handler │
│                     │   sendMessage /          │ + wp-manager.js  │   ws://host/api/v1/  │                  │
│ - Hook video events │   tabs.sendMessage       │                  │   watch-party/ws     │ Room Manager     │
│ - Apply sync cmds   │                         │ - WS connection  │                      │ (in-memory Map)  │
│ - getActiveVideo()  │                         │ - Route messages  │                      │                  │
└─────────────────────┘                         └──────────────────┘                      └──────────────────┘
```

**Modelo host-based**: o host controla playback, membros seguem. Simples, sem conflitos.

---

## Fase 1 — Backend (Schema + Room Manager + WS)

### 1.1 Schema: `apps/api/src/db/schema/watch-party.ts`

```
watch_party_rooms
  id            uuid PK
  code          text unique (6 chars, ex: "XK9M2P")
  host_user_id  uuid FK -> user
  title         text
  media_title   text?
  media_source  text? (netflix|disney|max|prime)
  media_url     text?
  max_members   int default 8
  status        text (waiting|active|ended)
  created_at    timestamptz
  ended_at      timestamptz?

watch_party_members
  id          uuid PK
  room_id     uuid FK -> rooms (cascade)
  user_id     uuid FK -> user (cascade)
  joined_at   timestamptz
  left_at     timestamptz?
  UNIQUE(room_id, user_id)

watch_party_messages
  id          uuid PK
  room_id     uuid FK -> rooms (cascade)
  user_id     uuid FK -> user (cascade)
  content     text
  created_at  timestamptz
```

Exportar de `apps/api/src/db/schema/index.ts`.

### 1.2 Extrair auth compartilhado: `apps/api/src/lib/extension-auth.ts`

Mover `resolveExtensionToken()` de `apps/api/src/routes/activity.ts` para modulo compartilhado. Activity.ts passa a importar dele. Watch Party WS tambem usa.

### 1.3 Room Manager: `apps/api/src/services/watch-party.ts`

In-memory `Map<code, RoomState>`:

```ts
interface RoomState {
  id: string;
  code: string;
  hostUserId: string;
  status: "waiting" | "active" | "ended";
  members: Map<string, { userId; username; avatarUrl; ws; ready; joinedAt }>;
  lastSync: { currentTime; paused; playbackRate; serverTimestamp } | null;
  createdAt: Date;
}
```

Metodos: `createRoom`, `joinRoom`, `leaveRoom`, `handleMessage`, `endRoom`, `broadcast`, `cleanupStale`.

### 1.4 Rotas REST: `apps/api/src/routes/watch-party.ts`

| Metodo | Path                                | Auth           | Descricao              |
| ------ | ----------------------------------- | -------------- | ---------------------- |
| POST   | `/watch-party/rooms`                | session/bearer | Criar sala             |
| GET    | `/watch-party/rooms/:code`          | session/bearer | Info da sala (preview) |
| POST   | `/watch-party/rooms/:code/join`     | session/bearer | Entrar (registro DB)   |
| POST   | `/watch-party/rooms/:code/end`      | session (host) | Encerrar sala          |
| GET    | `/watch-party/rooms/:code/messages` | session/bearer | Chat paginado          |
| GET    | `/watch-party/my-rooms`             | session        | Salas do usuario       |

### 1.5 WebSocket: montar em `apps/api/src/index.ts`

Elysia `app.ws()` precisa ser no app root (ou group `.use()`d). Endpoint: `/api/v1/watch-party/ws?token=<token>&room=<code>`.

Auth no `open()` via `resolveExtensionToken()` do query param.

### 1.6 Protocolo WS

**Cliente -> Servidor:**
| type | payload | quem |
|------|---------|------|
| `sync_state` | `{ currentTime, paused, playbackRate }` | host, a cada 2s |
| `play` | `{ currentTime }` | host |
| `pause` | `{ currentTime }` | host |
| `seek` | `{ currentTime }` | host |
| `chat` | `{ content }` | qualquer |
| `ready` | `{ ready: boolean }` | qualquer |

**Servidor -> Cliente:**
| type | payload | para |
|------|---------|------|
| `room_state` | `{ room, members[], recentMessages[] }` | novo membro |
| `member_joined` | `{ userId, username, avatarUrl }` | todos |
| `member_left` | `{ userId }` | todos |
| `sync_command` | `{ action, currentTime, serverTimestamp }` | nao-host |
| `sync_state` | `{ currentTime, paused, playbackRate, serverTimestamp }` | nao-host |
| `chat_message` | `{ id, userId, username, content, createdAt }` | todos |
| `host_changed` | `{ newHostUserId }` | todos |
| `room_ended` | `{}` | todos |
| `error` | `{ message }` | remetente |

### 1.7 Lifecycle da sala

1. Host cria via REST -> gera code 6 chars, insere DB, cria in-memory
2. Membros entram via REST -> registro DB, recebem wsUrl
3. Conexao WS -> auth token, join room in-memory, broadcast member_joined
4. Host desconecta -> 30s timeout, se nao volta promove membro mais antigo
5. Sem membros por 5min -> cleanup automatico (cron)
6. Host encerra -> broadcast room_ended, fecha WS, atualiza DB

### 1.8 Cron: `apps/api/src/services/cron.ts`

Adicionar job de cleanup: salas vazias por >5min ou waiting por >24h.

### 1.9 Migration

`npx drizzle-kit generate` + `npx drizzle-kit migrate` apos schema.

---

## Fase 2 — Extensao (Sync + Popup)

### 2.1 Novo: `extension/content/watch-party-sync.js`

Injetado em TODOS os content_scripts (apos scraper-base.js, antes do platform-specific). Usa `getActiveVideo()` do scraper-base.

**Host mode:**

- Escuta `video.onplay`, `video.onpause`, `video.onseeked`
- Envia WP_HOST_PLAY, WP_HOST_PAUSE, WP_HOST_SEEK para service worker
- Intervalo 2s envia WP_HOST_SYNC_STATE com currentTime

**Member mode:**

- Recebe WP_SYNC_COMMAND (via chrome.tabs.sendMessage do service worker)
- Aplica: `video.currentTime = X`, `video.play()` ou `video.pause()`
- Drift correction: se `|video.currentTime - expected| > 2s`, faz seek

**Ativacao:**

- Inativo por padrao. Ativado quando service worker envia WP_START com `{ isHost: bool }`
- Desativado com WP_STOP

**Coexistencia:** nao interfere com scraper. Scraper le, sync le+escreve. Ambos usam `getActiveVideo()`.

### 2.2 Novo: `extension/background/wp-manager.js`

Modulo ES (importado pelo service-worker.js). Gerencia:

- Conexao WebSocket com backend
- Reconnect com backoff exponencial (1s, 2s, 4s, max 30s)
- Routing de mensagens: WS <-> content script (via `chrome.tabs.sendMessage(tabId)`)
- Estado da sala (code, isHost, members)
- Track `watchPartyTabId` (tab ativa do watch party)

Exporta: `wpCreate(title, mediaTitle?, mediaSource?)`, `wpJoin(code)`, `wpLeave()`, `wpSendChat(content)`, `wpGetState()`.

### 2.3 Modificar: `extension/background/service-worker.js`

Adicionar message handlers:

- `WP_CREATE_ROOM` -> chama wpCreate()
- `WP_JOIN_ROOM` -> chama wpJoin(code)
- `WP_LEAVE_ROOM` -> chama wpLeave()
- `WP_SEND_CHAT` -> chama wpSendChat(content)
- `WP_GET_STATE` -> chama wpGetState()
- `WP_HOST_PLAY/PAUSE/SEEK/SYNC_STATE` -> redireciona para WS

Importar wp-manager no topo:

```js
import {
  wpCreate,
  wpJoin,
  wpLeave,
  wpSendChat,
  wpGetState,
  wpHandleHostAction,
} from "./wp-manager.js";
```

### 2.4 Modificar: `extension/manifest.json`

Adicionar `watch-party-sync.js` em cada content_scripts entry:

```json
"js": ["content/scraper-base.js", "content/watch-party-sync.js", "content/netflix.js"]
```

### 2.5 Modificar: Popup (popup.html + popup.js + popup.css)

Adicionar secao "Watch Party" abaixo do status card:

**Estado: sem sala**

- Botao "Criar Sala" (abre form com titulo)
- Input "Codigo da sala" + botao "Entrar"

**Estado: em sala**

- Badge com codigo da sala (copiavel)
- Lista de membros (online/ready)
- Mini chat (ultimas 5 msgs + input)
- Botao "Sair" (ou "Encerrar" se host)

### 2.6 Algoritmo de Sync (detalhe)

**Host -> Server -> Members:**

1. Host video emite `play` event -> content script envia WP_HOST_PLAY ao SW
2. SW envia `{ type: "play", currentTime }` pelo WS
3. Server recebe, broadcast `sync_command { action: "play", currentTime, serverTimestamp }` para nao-host
4. Members' SW recebe via WS, envia WP_SYNC_COMMAND ao content script via tabs.sendMessage
5. Content script faz `video.currentTime = ct; video.play()`

**Drift correction (a cada 2s):**

- Host envia sync_state com currentTime
- Member calcula `expected = syncState.currentTime + (Date.now() - serverTimestamp)/1000`
- Se `|video.currentTime - expected| > 2`: seek para expected

---

## Fase 3 — Frontend Web

### 3.1 `apps/web/src/app/(public)/watch-party/page.tsx`

Pagina principal:

- "Criar Sala" form (titulo, busca de midia opcional)
- "Entrar em Sala" input com codigo
- Lista de salas recentes do usuario

### 3.2 `apps/web/src/app/(public)/watch-party/[code]/page.tsx`

Lobby/detalhe:

- Info da sala, midia, membros
- Chat scrollavel (polling ou WS do browser)
- Instrucoes: "Abra [plataforma] com a extensao PixelReel para sincronizar"
- Link compartilhavel
- "Encerrar" se host

### 3.3 `apps/web/src/lib/queries/watch-party.ts`

Funcoes de API client para as rotas REST.

---

## Fase 4 — Polish (futuro)

- Overlay de chat na pagina do streaming (injection CSS)
- Ready check antes do host dar play
- Integracao com `club_screening_events` (evento gera sala automaticamente)
- Reacoes emoji flutuantes no video

---

## Sites Suportados

Todos os 4 desde o inicio: **Netflix, Disney+, Max, Prime Video**. O mecanismo de sync opera no `<video>` element que e universal. `getActiveVideo()` ja funciona em todos.

Validacao: ao entrar na sala, extensao compara `mediaSource` do host. Se diferente, aviso (nao bloqueio).

---

## Arquivos a Criar/Modificar

### Criar:

| Arquivo                                                 | Descricao                      |
| ------------------------------------------------------- | ------------------------------ |
| `apps/api/src/db/schema/watch-party.ts`                 | Schema das 3 tabelas           |
| `apps/api/src/lib/extension-auth.ts`                    | resolveExtensionToken extraido |
| `apps/api/src/services/watch-party.ts`                  | Room manager in-memory         |
| `apps/api/src/routes/watch-party.ts`                    | REST + WS routes               |
| `apps/api/drizzle/0012_watch_party.sql`                 | Migration (gerada)             |
| `extension/content/watch-party-sync.js`                 | Video sync no content script   |
| `extension/background/wp-manager.js`                    | WS client + room state         |
| `apps/web/src/app/(public)/watch-party/page.tsx`        | Pagina principal               |
| `apps/web/src/app/(public)/watch-party/[code]/page.tsx` | Lobby da sala                  |
| `apps/web/src/lib/queries/watch-party.ts`               | API client                     |

### Modificar:

| Arquivo                                  | Mudanca                                           |
| ---------------------------------------- | ------------------------------------------------- |
| `apps/api/src/db/schema/index.ts`        | Export do novo schema                             |
| `apps/api/src/index.ts`                  | Mount WS + REST routes                            |
| `apps/api/src/routes/activity.ts`        | Import de extension-auth.ts                       |
| `apps/api/src/services/cron.ts`          | Job de cleanup                                    |
| `extension/manifest.json`                | Adicionar watch-party-sync.js nos content_scripts |
| `extension/background/service-worker.js` | Import wp-manager, novos handlers                 |
| `extension/popup/popup.html`             | Secao Watch Party                                 |
| `extension/popup/popup.js`               | Logica Watch Party                                |
| `extension/popup/popup.css`              | Estilos novos                                     |

---

## Verificacao

1. **Backend:** Criar sala via REST, verificar DB. Conectar 2 clientes WS (wscat), testar broadcast de mensagens
2. **Extensao:** Carregar no Chrome via `chrome://extensions`. Criar sala no popup, verificar conexao WS nos devtools do SW
3. **Sync E2E:** Abrir Netflix em 2 abas (simulando 2 usuarios). Host da play -> verificar que member sincroniza
4. **Chat:** Enviar mensagem de um cliente, verificar que aparece no outro
5. **Edge cases:** Host desconecta (promove membro?), sala vazia (cleanup?), token invalido (erro WS?)
