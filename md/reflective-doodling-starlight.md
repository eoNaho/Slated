# Sistema de Moderacao — PixelReel

## Context

PixelReel precisa de um sistema de moderacao abrangente para cobrir: reviews, comentarios, uploads de imagem (avatar/capa/capa custom de apoiadores), e o futuro chat do watch party. Hoje existe uma tabela `reports` e rotas admin basicas, mas falta: endpoint de denuncia para usuarios, bloqueio entre usuarios, filtragem de conteudo, deteccao NSFW, e infraestrutura de moderador. O objetivo e construir tudo isso de forma incremental.

**Decisoes do usuario:**
- NSFW: nsfwjs local (TensorFlow.js no servidor)
- Watch party: planejar apenas hooks de moderacao (watch party sera construido separadamente)
- Wordlist: seed inicial pt-BR/EN + gerenciamento via admin

---

## Fase 1 — Schema e Infraestrutura Base

### 1.1 Novo schema: `apps/api/src/db/schema/moderation.ts`

Criar e exportar de `apps/api/src/db/schema/index.ts`.

**Tabela `user_blocks`:**
- id (uuid PK), blockerId (FK user, cascade), blockedId (FK user, cascade), createdAt
- UNIQUE(blockerId, blockedId), CHECK(blockerId != blockedId)
- Indexes: blocker, blocked

**Tabela `moderation_actions`** (audit log de moderacao):
- id, moderatorId (FK user, set null), targetType (user/review/comment/chat_message/image), targetId (text), action (remove/hide/warn/mute/kick/ban/suspend/approve/restore), reason, metadata (JSON), reportId (FK reports, set null), automated (bool), createdAt
- Indexes: moderator, target(type+id), createdAt, reportId

**Tabela `content_flags`** (deteccoes automaticas):
- id, contentType (review/comment/chat_message/image/bio/username), contentId, userId (FK user, cascade), flagType (profanity/spam/nsfw/hate_speech/personal_info), severity (low/medium/high/critical), matchedTerms (JSON), confidence (real), status (pending/confirmed/dismissed), reviewedBy (FK user), reviewedAt, createdAt
- Indexes: status, contentType, userId, createdAt

**Tabela `word_blocklist`:**
- id, word, language (pt-BR/en/universal), category (profanity/slur/spam_pattern/hate_speech), severity, isRegex (bool), isActive (bool), addedBy (FK user), createdAt
- UNIQUE(word, language)

### 1.2 Modificacoes em tabelas existentes

**`reviews` em `apps/api/src/db/schema/content.ts`:**
- Adicionar `isHidden: boolean default false`
- Adicionar `hiddenReason: text nullable`

**`comments` em `apps/api/src/db/schema/social.ts`:**
- Adicionar `isHidden: boolean default false`
- Adicionar `hiddenReason: text nullable`

**`reports` em `apps/api/src/db/schema/premium.ts`:**
- Adicionar `resolutionNote: text nullable`

### 1.3 Migration

Gerar via `npx drizzle-kit generate` apos schema changes.

---

## Fase 2 — Bloqueio de Usuarios e Denuncias

### 2.1 Rotas de bloqueio em `apps/api/src/routes/moderation.ts` (novo arquivo)

| Metodo | Path | Auth | Descricao |
|--------|------|------|-----------|
| POST | /users/:userId/block | session | Bloquear usuario |
| DELETE | /users/:userId/block | session | Desbloquear |
| GET | /users/me/blocked | session | Listar bloqueados |

**Integrar bloqueio nas queries existentes:**
- `apps/api/src/routes/reviews.ts` — filtrar reviews de usuarios bloqueados nas listagens
- `apps/api/src/routes/social.ts` / comments — impedir comentarios em conteudo de quem te bloqueou
- Feed/discover — excluir conteudo de usuarios bloqueados

### 2.2 Endpoint de denuncia em `apps/api/src/routes/moderation.ts`

| Metodo | Path | Auth | Descricao |
|--------|------|------|-----------|
| POST | /reports | session | Submeter denuncia |
| GET | /reports/mine | session | Minhas denuncias |

**POST /reports body:**
```
target_type: user | review | comment | list | chat_message
target_id: string
reason: spam | harassment | hate_speech | nsfw | spoilers_unmarked | impersonation | other
description?: string (max 2000)
```

**Validacoes:** target existe, sem duplicata do mesmo user nas ultimas 24h, rate limit 10/dia.

**Auto-prioridade:** 3+ reports pendentes no mesmo target → priority "high".

### 2.3 Rotas de moderador em `apps/api/src/routes/moderator.ts` (novo arquivo)

Guard: `role === 'moderator' || role === 'admin'`

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | /moderator/queue | Reports + flags pendentes, paginado, ordenado por prioridade |
| GET | /moderator/queue/stats | Contagem por status/tipo |
| GET | /moderator/reports/:id | Detalhe com conteudo alvo carregado |
| PATCH | /moderator/reports/:id/assign | Atribuir a si/outro moderador |
| PATCH | /moderator/reports/:id/resolve | Resolver (acao: warn/remove/hide/dismiss) |
| POST | /moderator/content/:type/:id/hide | Ocultar review/comentario |
| POST | /moderator/content/:type/:id/restore | Restaurar conteudo oculto |
| POST | /moderator/users/:id/warn | Enviar aviso ao usuario |
| GET | /moderator/users/:id/history | Historico de moderacao do usuario |
| GET | /moderator/flags | Flags automaticas |
| PATCH | /moderator/flags/:id | Confirmar ou dispensar flag |

### 2.4 Extensao admin em `apps/api/src/routes/admin.ts`

| Metodo | Path | Descricao |
|--------|------|-----------|
| GET | /admin/moderation/blocklist | Listar wordlist |
| POST | /admin/moderation/blocklist | Adicionar palavras |
| DELETE | /admin/moderation/blocklist/:id | Remover palavra |
| PATCH | /admin/moderation/blocklist/:id | Toggle ativo/inativo |
| PATCH | /admin/users/:id/role | Promover/rebaixar moderador |
| GET | /admin/moderation/actions | Log completo de acoes |

---

## Fase 3 — Content Filter Service

### 3.1 Novo servico: `apps/api/src/services/content-filter.ts`

**Classe `ContentFilterService`** com singleton exportado.

**`checkText(text, context) -> FilterResult`**

Pipeline:
1. **Normalizar** — lowercase, strip acentos para matching, expandir leetspeak (@ → a, 4 → a, 3 → e)
2. **Blocklist match** — carregar `wordBlocklist` do DB com cache in-memory (5min TTL). Match exato + regex. Normalizar diacriticos para pegar evasoes.
3. **Spam patterns** — chars repetidos (5+), ALL CAPS (>70% em msgs >20 chars), URLs multiplas
4. **Rate spam** — mesma mensagem do mesmo user em 60s (tracked via Redis/in-memory Map)

**Resultado:**
```ts
interface FilterResult {
  passed: boolean;
  flags: { type: string; severity: string; matchedTerms: string[] }[];
  sanitizedText?: string; // com palavras censuradas por ***
}
```

**Comportamento por severidade:**
- **low:** permite, cria `contentFlags` para revisao background
- **medium:** permite mas marca `isHidden = true`, cria flag
- **high/critical:** rejeita com 400, cria flag

### 3.2 Integracoes do checkText

- `apps/api/src/routes/reviews.ts` — POST/PATCH (antes do insert/update)
- Rotas de comments (POST)
- `apps/api/src/routes/users.ts` — PATCH /me (campo bio)
- Futuro: handler de chat do watch party

### 3.3 Seed da wordlist

Criar script `apps/api/src/db/seed-blocklist.ts` com:
- ~100 palavroes pt-BR comuns (categorias: profanity, slur, hate_speech)
- ~50 termos EN comuns
- ~10 regex patterns para variacoes morfologicas pt-BR (ex: `put[ao@]`, `merda[s]?`)

---

## Fase 4 — Moderacao de Imagens (NSFW)

### 4.1 Novo servico: `apps/api/src/services/nsfw-detector.ts`

- Usar `nsfwjs` (TensorFlow.js)
- Carregar modelo uma vez no startup (lazy init no primeiro uso)
- Metodo: `checkImage(buffer: Buffer) -> { safe: boolean, scores: Record<string, number>, flagType?: string }`
- Thresholds: porn > 0.7, hentai > 0.5, sexy > 0.8 → flaggar

### 4.2 Integrar nos uploads

**`apps/api/src/routes/users.ts`** — POST /me/avatar e POST /me/cover:
- Apos validacao de tipo/tamanho (ja existe), rodar `nsfwDetector.checkImage(buffer)`
- Se flaggado: rejeitar upload com 400 "Imagem viola diretrizes da comunidade"
- Criar `contentFlags` entry para auditoria

**Futuro: custom cover para apoiadores** — mesma logica, rota nova quando implementada.

### 4.3 Dependencias npm

Adicionar ao `apps/api/package.json`:
- `nsfwjs`
- `@tensorflow/tfjs-node` (ou `@tensorflow/tfjs` se tfjs-node nao funcionar com Bun)

---

## Fase 5 — Hooks de Moderacao para Watch Party

**Nota:** O watch party em si sera construido separadamente. Aqui definimos apenas os pontos de integracao.

### 5.1 Tabela `watch_party_mutes` em `apps/api/src/db/schema/moderation.ts`

- id, roomCode (text), userId (FK user, cascade), mutedBy (FK user, set null), reason, expiresAt (nullable = permanente na sessao), createdAt
- UNIQUE(roomCode, userId)

### 5.2 Interface de moderacao para o WS handler

Quando o watch party for implementado, o handler de mensagem `chat` deve:

```
1. Checar se user esta mutado (in-memory Map carregado de watch_party_mutes)
   → Se mutado e nao expirado: rejeitar, enviar erro so pro sender
2. ContentFilterService.checkText(text, { type: 'chat', userId })
   → critical: rejeitar + auto-mute 5min + broadcast msg sistema
   → high: rejeitar + log flag
   → medium: sanitizar (***) + permitir
   → low/pass: permitir
3. Rate limit: 10 msgs / 30s por user por sala
   → Excedido: dropar msg + aviso throttle pro sender
4. Broadcast + persistir em watch_party_messages
```

### 5.3 Comandos de moderacao via WS

Tipos de mensagem do protocolo:
- `{ type: "mod_action", action: "mute", targetUserId, duration }` — host ou moderador
- `{ type: "mod_action", action: "unmute", targetUserId }` — host ou moderador
- `{ type: "mod_action", action: "kick", targetUserId }` — desconecta WS, adiciona ao set kicked

**Autorizacao:** host pode mute/kick membros normais; moderadores globais podem mute/kick qualquer nao-admin; admins podem tudo.

---

## Fase 6 — Notificacoes e Automacao

### 6.1 Novos tipos de notificacao

Usar tabela `notifications` existente em `apps/api/src/db/schema/security.ts`. Adicionar tipos:

- `moderation_warning` — "Sua conta recebeu um aviso por violar as diretrizes da comunidade."
- `content_hidden` — "Sua [review/comentario] foi ocultada por violar as diretrizes."
- `content_restored` — "Sua [review/comentario] foi restaurada apos revisao."
- `account_suspended` — "Sua conta foi suspensa por [X] dias."
- `report_resolved` — "Sua denuncia foi analisada. Obrigado!"

### 6.2 Auto-escalacao

- 3+ reports pendentes no mesmo target → priority "high"
- User com 3+ flags confirmadas em 7 dias → auto-suspend 24h + alerta moderadores
- Inserir `moderation_actions` com `automated: true` para acoes automaticas

### 6.3 Workflow de resolucao

```
Report recebido → status: pending → prioridade calculada
  → Moderador pega da fila (assign)
  → Revisa conteudo + historico do user
  → Acao: dismiss | warn | hide | remove | suspend | ban
  → Cria moderation_actions entry
  → Notifica autor do conteudo
  → Notifica reporter (report_resolved)
  → Marca duplicatas como resolvidas
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `apps/api/src/db/schema/moderation.ts` | Tabelas: user_blocks, moderation_actions, content_flags, word_blocklist, watch_party_mutes |
| `apps/api/src/services/content-filter.ts` | ContentFilterService (texto) |
| `apps/api/src/services/nsfw-detector.ts` | NsfwDetector (imagens com nsfwjs) |
| `apps/api/src/routes/moderation.ts` | Rotas user-facing: reports, blocks |
| `apps/api/src/routes/moderator.ts` | Rotas moderador: queue, acoes, flags |
| `apps/api/src/db/seed-blocklist.ts` | Seed de palavroes pt-BR/EN |
| Migration SQL (gerada) | Todas as novas tabelas + colunas |

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `apps/api/src/db/schema/index.ts` | Export moderation schema |
| `apps/api/src/db/schema/content.ts` | isHidden + hiddenReason em reviews |
| `apps/api/src/db/schema/social.ts` | isHidden + hiddenReason em comments |
| `apps/api/src/db/schema/premium.ts` | resolutionNote em reports |
| `apps/api/src/routes/reviews.ts` | Integrar content filter no POST/PATCH, filtrar isHidden nas queries, filtrar blocked users |
| `apps/api/src/routes/users.ts` | Integrar NSFW check nos uploads avatar/cover |
| `apps/api/src/routes/admin.ts` | Rotas de blocklist, role management, moderation actions log |
| `apps/api/src/index.ts` | Registrar rotas moderation + moderator |
| `apps/api/package.json` | Adicionar nsfwjs + @tensorflow/tfjs |

## Verificacao

1. **Schema:** Rodar migration, verificar tabelas no banco
2. **Bloqueio:** POST block → verificar que conteudo do bloqueado nao aparece em queries
3. **Reports:** POST report → verificar no GET /moderator/queue → resolver → verificar status
4. **Content filter:** POST review com palavrao → verificar rejeicao/flag
5. **NSFW:** Upload avatar NSFW → verificar rejeicao
6. **Notificacoes:** Apos acao de moderacao → verificar notificacao criada para o usuario
7. **Auto-escalacao:** Criar 3+ reports no mesmo target → verificar que priority subiu para "high"
