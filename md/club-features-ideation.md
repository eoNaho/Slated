# Ideação de Funcionalidades para o "Clubs" 🎬

Analisando a estrutura atual (seu schema do Drizzle), percebi que **vocês já têm uma fundação excelente**. O sistema atual já prevê eventos sincronizados (Watch/Discussion), Watchlist do clube, Posts (com comentários) e Enquetes (Polls). 

Com base nisso, aqui estão ideias de como expandir o que já existe e como implementar a nova ideia de **Listas do Clube**, criando uma experiência social única para o **Kinofolio**!

---

## 1. 📋 Listas do Clube (Club Lists)
Assim como os usuários têm suas próprias listas (compostas por `lists` e `listItems`), os Clubes podem ter listas curadas.
*   **Listas Colaborativas vs. Listas do Admin:**
    *   *Listas Oficiais:* Criadas pelos Admins/Moderadores (ex: "Seleção Oficial do Clube 2026", "Favoritos da Moderação").
    *   *Listas Colaborativas:* Qualquer membro pode adicionar itens (usando a mesma lógica posicional dos `listItems`), gerando listas como "Hall da Fama do Clube" onde os membros montam juntos.
*   **Ranked & Thematic (Reutilizando conceitos):** Como o sistema de Listas de usuários tem as flags `isRanked` e `isThematic`, os clubes poderiam ter listas ranqueadas coletivamente.
*   **Como fazer no schema:** Criar uma tabela `club_lists` (ou adicionar um `club_id` opcional na tabela `lists` atual) e `club_list_items`.

## 2. 🔌 Integração Mágica com a Extensão (Browser Extension)
Como vocês estão desenvolvendo uma extensão para o navegador (`disney.js`, `prime.js`), a integração com o Clube pode ser o **killer feature** do Kinofolio:
*   **"Watching Now" no Clube:** Se o filme atual for um evento (`clubScreeningEvents`) ou estiver na Watchlist do clube (`clubWatchlistItems`), a extensão detecta o play na Netflix/Disney+ e posta automaticamente em `clubPosts`: *“🍿 O membro [Naho] acabou de dar play no nosso Filme da Semana no Disney+!”*
*   **Sincronia Simples de Progresso:** A extensão marca automaticamente como `isWatched` no `clubWatchlistItems` quando o membro termina de ver.

## 3. 🗳️ A Evolução das Enquetes (Smart Polls)
Vocês já têm tabelas `clubPolls` e `clubWaitlistItems`. Podemos juntá-las:
*   **Gerador de Enquetes da Watchlist:** Um clique no Hub do Clube que pega 4 filmes não-assistidos aleatórios da `club_watchlist_items` e cria um `clubPoll` perguntando: *"O que vamos assistir neste final de semana?"*.
*   **Resultado Automático:** Quando a enquete acaba, o vencedor vira automaticamente um **Evento** (`clubScreeningEvents`) agendado. 

## 4. 🏆 Gamificação com os Dados Atuais
Como o banco de dados já armazena quem sugeriu o filme (`suggestedBy` em `clubWatchlistItems`) e quem confirmou presença em eventos (`clubEventRsvps`), podemos criar um **Leaderboard do Clube**:
*   *🏆 O Curador:* Quem sugeriu as obras que receberam mais "likes" ou melhores notas.
*   *🥇 Festeiro:* O membro com mais presenças confirmadas e validadas nos `clubScreeningEvents`.
*   *🗣️ O Crítico:* O membro que mais inicia discussões ricas (`clubPosts`).

## 5. 💬 Hub de Discussão "Anti-Spoiler"
Vocês já têm `clubPosts` e a tabela do usuário `diary`.
*   Quando um filme da Watchlist do clube é assistido, um post fixado (`isPinned: true`) é gerado automaticamente.
*   **Filtro Inteligente:** Somente usuários cujo `diary` registrar que *já assistiram* àquele filme poderão ler os comentários daquele post. Para os outros, a interface mostra a mensagem: *"Assista ao filme para desbloquear esta discussão!"*

---

### Resumo Tecnológico: Qual caminho seguir?
1.  **Se quiser focar em UI/UX logo:** Implementar o design das **Club Lists**, que reaproveita a lógica de listas que você já construiu, mas aplicando ao ecossistema do clube.
2.  **Se quiser focar em Inovação:** Fazer o link entre o `popup.js/content.js` da **Extensão** e as enquetes/eventos do Clube.

Qual dessas funcionalidades brilha mais para você agora? Podemos começar a desenhar o banco de dados das `club_lists` ou detalhar a lógica de algum outro ponto!
