# Site de Reviews com Watch Party, Activity Tracking e Scrobbles

> Plataforma de reviews de filmes e séries com funcionalidades sociais avançadas: salas de watch party sincronizadas, tracking automático do que o usuário está assistindo via extensão de navegador, e um sistema de scrobbles para registrar o histórico completo de tudo que foi assistido.

---

## Visão Geral

O site combina quatro camadas principais:

1. **Reviews e comunidade** — base da plataforma, onde usuários avaliam e discutem filmes e séries
2. **Watch Party** — salas para assistir junto com amigos em tempo real, sincronizando Netflix, Prime Video e similares
3. **Activity Tracking (RPC)** — extensão que detecta automaticamente o que o usuário está assistindo e exibe isso no perfil
4. **Scrobbles** — registro histórico permanente de cada título assistido, base para estatísticas e comparação social

---

## Funcionalidade 1 — Reviews e Comunidade

A espinha dorsal do site. Usuários podem:

- Dar notas e escrever reviews de filmes e séries
- Criar listas (ex: "Melhores de 2024", "Quero assistir")
- Seguir outros usuários e ver o feed de atividade deles
- Comentar e reagir às reviews de outras pessoas
- Ver rankings e recomendações baseados no gosto da comunidade

---

## Funcionalidade 2 — Watch Party

### Como funciona

Uma extensão de navegador injeta um script nas páginas do Netflix, Prime Video, Disney+ e similares. Esse script "escuta" os eventos do player de vídeo e os sincroniza entre todos os participantes da sala via WebSocket.

O vídeo em si continua sendo servido normalmente pela plataforma — a extensão apenas coordena o estado do player (play, pause, seek) entre os usuários.

```
Host dá play
    → extensão captura o evento
    → manda para o servidor WebSocket
    → servidor repassa para todos na sala
    → extensão de cada usuário executa play no player deles
```

### O que é sincronizado

| Evento       | Descrição                             |
| ------------ | ------------------------------------- |
| Play / Pause | Todos param e voltam juntos           |
| Seek         | Todos pulam para o mesmo trecho       |
| Timestamp    | Correção periódica de deriva de tempo |

### Chat ao vivo

Junto com a sincronia, a sala tem um chat em tempo real pela mesma conexão WebSocket. As mensagens podem ser salvas e associadas ao filme/episódio, criando uma espécie de "comentário ao vivo" que outros usuários podem ler depois.

### Limitações importantes

- **Requer extensão instalada** — funciona apenas no Chrome/Firefox desktop. Mobile não é suportado.
- **Cada usuário precisa ter assinatura própria** na plataforma — o site nunca toca no conteúdo em si.
- **Manutenção contínua** — Netflix e similares atualizam o HTML interno com frequência, o que pode quebrar os seletores da extensão.
- **Termos de serviço** — as plataformas proíbem modificação da interface nos ToS. O risco é baixo para o usuário (só leitura de DOM), mas vale monitorar.

### Stack técnico

- **Backend:** Node.js + Socket.io
- **Salas:** ID único por sala, gerenciadas em memória + Redis para escala
- **Extensão:** Manifest V3 (Chrome/Firefox)
- **Referências open source:** [AstitvaG/WatchParty](https://github.com/AstitvaG/WatchParty), [cory321/netflixparty-chrome](https://github.com/cory321/netflixparty-chrome)

---

## Funcionalidade 3 — Activity Tracking (RPC)

### Conceito

Inspirado no **Last.fm** (que traceia músicas) e no **Trakt.tv** (que faz exatamente isso para filmes/séries). A extensão detecta automaticamente o que o usuário está assistindo e atualiza o perfil dele no site em tempo real.

### Como a extensão detecta o conteúdo

A extensão lê o DOM da página para identificar o título e o progresso:

```js
// Exemplo: Netflix
const titulo = document.querySelector(".video-title h4")?.innerText;
const video = document.querySelector("video");
const progresso = (video.currentTime / video.duration) * 100;
```

A cada ~10 segundos, enquanto o vídeo estiver rodando, a extensão manda um **heartbeat** para a API do site. Quando o progresso chega em ~85%, o título é marcado automaticamente como assistido.

### API

Um único endpoint resolve tudo:

```
PATCH /api/activity
Authorization: Bearer <token_do_usuario>

{
  "title": "Breaking Bad",
  "season": 3,
  "episode": 4,
  "progress": 42.5,
  "source": "netflix",
  "status": "watching" | "finished" | "paused"
}
```

O token é gerado uma vez nas configurações do perfil — sem precisar guardar senha na extensão.

### Como aparece no perfil

```
┌─────────────────────────────────┐
│ 🎬 Assistindo agora             │
│ Breaking Bad · Temporada 3 Ep.4 │
│ há 12 minutos                   │
└─────────────────────────────────┘

Recentemente assistido:
  • Oppenheimer — ontem
  • Duna: Parte 2 — sexta-feira

Este mês: 14 filmes · 3 séries · 47h
```

### Privacidade

O usuário tem controle total:

- **Público** — qualquer pessoa vê no perfil
- **Só seguidores** — visível apenas para quem segue
- **Privado** — aparece só para o próprio usuário
- **Pausar tracking** — desativa via toggle na extensão, sem desinstalar

### Por que é menos arriscado que o Watch Party

A extensão apenas **lê** o título do filme na página — não modifica nada, não intercepta o player, não altera o comportamento da plataforma. É equivalente ao usuário copiar o nome do filme manualmente. Risco de violação de ToS é mínimo.

---

## Funcionalidade 4 — Sistema de Scrobbles

### Conceito

Termo popularizado pelo **Last.fm**: cada vez que o usuário termina de assistir algo, um scrobble é registrado. É diferente do activity tracking — o tracking é **efêmero** (estado atual: "está assistindo agora"), enquanto o scrobble é **permanente** (evento histórico: "assistiu em tal data e hora").

Os dois coexistem: o tracking dispara o scrobble automaticamente quando o progresso atinge o threshold definido.

### Quando um scrobble é registrado

| Tipo     | Threshold        | Resultado                       |
| -------- | ---------------- | ------------------------------- |
| Filme    | ~80% assistido   | 1 scrobble para o filme         |
| Episódio | ~80% do episódio | 1 scrobble para aquele episódio |
| Rewatch  | Qualquer         | Novo scrobble com nova data     |

Rewatches são registrados separadamente — o histórico é imutável e cronológico, não um simples flag "já vi".

### Estrutura no banco de dados

```sql
scrobbles
  id          uuid
  user_id     uuid
  tmdb_id     integer      -- ID do filme ou série na API do TMDB
  media_type  text         -- "movie" | "episode"
  season      integer      -- null para filmes
  episode     integer      -- null para filmes
  source      text         -- "netflix" | "prime" | "disney" | "manual"
  watched_at  timestamptz  -- momento exato do scrobble
  progress    float        -- % quando o scrobble foi disparado
```

### Scrobble manual

Nem sempre o usuário vai assistir com a extensão ativa. O site permite registrar scrobbles manualmente pela interface — com data retroativa, caso o usuário queira registrar algo que assistiu antes de criar a conta.

### O que o sistema de scrobbles alimenta

**Estatísticas do perfil:**

- Total de filmes e episódios assistidos
- Horas totais consumidas
- Streak de dias assistindo
- Diretores, atores e gêneros favoritos (por frequência de scrobble)
- Mês/ano mais ativo

**Histórico cronológico:**

- Timeline completa de tudo que foi assistido
- Filtrável por ano, plataforma, gênero
- Exportável (formato compatível com Letterboxd e Trakt)

**Comparação social:**

- "Você e fulano têm 23 filmes em comum"
- "Seus amigos mais assistiram X este mês"
- Compatibilidade de gosto baseada no histórico

**Integração com reviews:**

- Ao scrobblar, o site pergunta se o usuário quer deixar uma review rápida
- Reviews ficam associadas à data de visualização, não à data de escrita
- Possibilidade de ver a evolução da opinião em rewatches

### Como aparece no perfil

```
Histórico de scrobbles — outubro 2025
─────────────────────────────────────
28/10  Alien: Romulus             Netflix   ★★★★
27/10  The Bear · S03E05          Prime     —
27/10  The Bear · S03E04          Prime     —
25/10  Conclave                   Cinema    ★★★★★
22/10  The Bear · S03E03          Prime     —

Stats do mês
  12 filmes · 8 episódios · 31h assistidas
  Gênero mais visto: Thriller
  Diretor mais visto: Ridley Scott (3 filmes)
```

---

## Arquitetura Geral

```
Extensão de Navegador
    ├── content_script.js   → lê DOM de Netflix/Prime/Disney+
    ├── background.js       → gerencia heartbeats, WebSocket e disparo de scrobbles
    └── popup.html          → toggle de tracking, link para o perfil

Backend
    ├── API REST            → reviews, perfis, histórico
    ├── WebSocket Server    → sincronização das watch parties
    └── Banco de dados      → usuários, reviews, activity (efêmero), scrobbles (permanente)

Site
    ├── Perfil do usuário   → "assistindo agora", histórico de scrobbles, stats
    ├── Página do filme     → reviews, nota média, quem assistiu e quando
    └── Sala de watch party → chat + controle sincronizado
```

---

## Roadmap Sugerido

### Fase 1 — Base (MVP)

- [ ] Sistema de reviews e notas
- [ ] Perfis de usuário
- [ ] Integração com TMDB para dados de filmes/séries
- [ ] Feed de atividade

### Fase 2 — Activity Tracking e Scrobbles

- [ ] Extensão de navegador (Manifest V3)
- [ ] Suporte a Netflix, Prime Video, YouTube
- [ ] "Assistindo agora" no perfil (activity tracking efêmero)
- [ ] Disparo automático de scrobble ao atingir ~80% do conteúdo
- [ ] Scrobble manual com data retroativa
- [ ] Histórico cronológico de scrobbles no perfil
- [ ] Estatísticas mensais (filmes, horas, gêneros, diretores)

### Fase 3 — Watch Party

- [ ] Servidor WebSocket para salas
- [ ] Sincronização play/pause/seek
- [ ] Chat ao vivo nas salas
- [ ] Salvar chat como "comentários ao vivo" na página do filme

### Fase 4 — Social e Exportação

- [ ] Sistema de seguidores
- [ ] Notificações ("fulano começou a assistir X")
- [ ] Comparação de scrobbles entre amigos ("vocês têm X filmes em comum")
- [ ] Recomendações baseadas no histórico de scrobbles
- [ ] Integração do chat da watch party com as reviews
- [ ] Exportação do histórico (compatível com Letterboxd e Trakt.tv)

---

## Referências

- [Teleparty](https://www.teleparty.com/) — watch party mais popular, funciona via extensão
- [Trakt.tv](https://trakt.tv/) — referência de activity tracking para filmes/séries
- [Last.fm](https://www.last.fm/) — referência de scrobbling (conceito de tracking automático)
- [AstitvaG/WatchParty](https://github.com/AstitvaG/WatchParty) — open source, multi-plataforma
- [cory321/netflixparty-chrome](https://github.com/cory322/netflixparty-chrome) — código original do Netflix Party
