# Documentação Completa da API - PixelReel

## Visão Geral

Esta documentação fornece uma análise detalhada e abrangente de todas as funcionalidades implementadas na API do PixelReel, uma plataforma social completa para cinéfilos e amantes de séries. Construída com Elysia (framework moderno para Bun), a API oferece mais de 100 endpoints organizados em 23 módulos distintos, abrangendo desde gerenciamento de usuários até sistemas avançados de gamificação e monetização.

A plataforma combina elementos de redes sociais tradicionais com funcionalidades específicas do entretenimento audiovisual, incluindo integração com The Movie Database (TMDB), sistema de assinaturas via Stripe, e armazenamento otimizado com Backblaze B2.

## Funcionalidades Principais

### 1. Gerenciamento de Clubes

O sistema de clubes representa o coração social da plataforma, permitindo que usuários criem comunidades temáticas em torno de interesses cinematográficos compartilhados. Cada clube funciona como um espaço colaborativo onde membros podem compartilhar descobertas, organizar eventos virtuais e construir uma identidade coletiva.

**Criação de Clubes**:

- **Processo de Criação**: Os usuários podem estabelecer novos clubes definindo parâmetros essenciais como nome único, descrição narrativa detalhada (até 500 caracteres), configuração de privacidade (público/privado), política de admissão automática e até três categorias temáticas específicas (exemplos incluem "horror", "by-director", "anime", "documentary", "classic-cinema").
- **Limitações por Assinatura**: A capacidade de criação é diretamente influenciada pelo plano de assinatura do usuário. Usuários gratuitos podem criar até 2 clubes, enquanto assinantes premium têm limites expandidos (Tier 1: 10 clubes, Tier 2: 25 clubes, Tier 3: ilimitado).
- **Validações**: Nomes devem ser únicos globalmente, descrições obrigatórias, pelo menos uma categoria deve ser selecionada. O sistema previne criação excessiva através de rate limiting (máximo 3 criações por hora).
- **Endpoint**: `POST /clubs`

**Busca e Listagem Avançada**:

- **Paginação Inteligente**: Sistema de paginação com cursor-based para performance otimizada, retornando 20 clubes por página por padrão, com máximo de 50.
- **Filtros Multidimensionais**: Filtragem por categoria específica, ordenação por popularidade (membros ativos), data de criação, ou relevância de busca textual.
- **Busca Full-Text**: Algoritmo de busca que indexa nomes e descrições, com suporte a sinônimos e correção automática de typos para melhorar descoberta.
- **Endpoint**: `GET /clubs`

**Perfis de Clube Personalizáveis**:

- **Identificação Única**: Cada clube possui tanto um UUID interno quanto um slug customizável (ex: "cinefilos-brasil"), gerado automaticamente ou definido pelo criador.
- **Estilização Visual**: Sistema de banners/capas com upload direto, suporte a formatos JPG/PNG/WebP, otimização automática de tamanho (máximo 2MB), e geração de thumbnails múltiplas resoluções.
- **Permissões Hierárquicas**: Owners têm controle total, Moderators podem gerenciar conteúdo mas não configurações estruturais, Members têm acesso limitado.
- **Endpoints**: `GET /clubs/:id`, `POST /clubs/:id/cover`, `DELETE /clubs/:id/cover`

**Edição e Gerenciamento Administrativo**:

- **Controle Granular**: Modificação de todas as propriedades do clube, incluindo mudança de ownership (transferência para outro membro), ajuste de configurações de privacidade, e atualização de categorias.
- **Auditoria**: Todo histórico de mudanças é registrado para moderação e resolução de disputas.
- **Deleção em Cascata**: Remoção do clube implica exclusão de todo conteúdo associado (posts, eventos, watchlists), com período de graça de 30 dias para recuperação.
- **Endpoints**: `PATCH /clubs/:id`, `DELETE /clubs/:id`

**Sistema de Ingresso e Participação**:

- **Ingresso Público**: Para clubes públicos, adesão instantânea sem aprovação.
- **Sistema de Convites**: Para clubes privados, owners e mods podem enviar convites personalizados com mensagens, com rastreamento de status (pendente, aceito, expirado).
- **Gestão de Membros**: Visualização completa da lista de membros com roles, data de ingresso, e atividade recente. Capacidade de remover membros problemáticos.
- **Endpoints**: `POST /clubs/:id/join`, `DELETE /clubs/:id/leave`, `GET /clubs/invites`

**Conteúdo Colaborativo do Clube**:

- **Watchlist Compartilhada**: Sistema de lista coletiva onde membros podem sugerir mídia, votar em prioridades, e marcar itens como "assistidos pelo clube".
- **Eventos de Exibição**: Organização de watch parties virtuais com agendamento, RSVP obrigatório, e integração com calendários externos.
- **Sistema de Discussão**: Posts e comentários aninhados para debates sobre mídia, com suporte a markdown, links, e menções a membros.
- **Endpoints**: `GET /clubs/:id/watchlist`, `POST /clubs/:id/watchlist`, `GET /clubs/:id/events`, `POST /clubs/:id/events`, `GET /clubs/:id/posts`, `POST /clubs/:id/posts`

### 2. Gerenciamento de Usuários

O sistema de usuários forma a base da identidade social da plataforma, oferecendo perfis ricos e interações sociais profundas que vão além do simples registro.

**Perfis de Usuário Abrangentes**:

- **Informações Pessoais**: Nome de exibição customizável (até 50 caracteres), biografia detalhada (até 500 caracteres), localização geográfica, website pessoal, e avatar personalizado com upload direto.
- **Links Sociais Integrados**: Conexão com plataformas externas (Twitter, Instagram, Letterboxd, IMDb, etc.) com validação automática de URLs e preview de perfis.
- **Visibilidade Controlada**: Sistema granular de privacidade onde usuários podem escolher quais informações são públicas, visíveis apenas para seguidores, ou completamente privadas.
- **Verificação de Conta**: Sistema de badges para contas verificadas (influencers, críticos profissionais), obtidas através de aplicação manual ou marcos automáticos.
- **Endpoints**: `GET /users/:username`, `PATCH /users/me`

**Sistema de Seguidores Sofisticado**:

- **Relações Bidirecionais**: Seguidores e seguindo com contadores em tempo real, atualizados através de webhooks para performance.
- **Descoberta Social**: Sugestões inteligentes baseadas em clubes compartilhados, gostos similares, e conexões mútuas.
- **Notificações de Atividade**: Alertas instantâneos quando usuários seguidos publicam reviews, criam listas, ou ingressam em clubes.
- **Limites de Segurança**: Proteção contra spam com limites diários de follows (máximo 50 por dia para contas novas, ilimitado para verificadas).
- **Endpoints**: `POST /users/:userId/follow`, `DELETE /users/:userId/follow`, `GET /users/:username/followers`, `GET /users/:username/following`

**Estatísticas Pessoais Abrangentes**:

- **Métricas de Consumo**: Contagem precisa de filmes e séries assistidos, tempo total de tela em minutos, média de avaliação pessoal.
- **Atividade Criativa**: Número de reviews escritas, listas criadas, comentários feitos, itens adicionados à watchlist.
- **Engajamento Social**: Contadores de seguidores, seguindo, likes recebidos, menções em posts de clube.
- **Sistema de XP**: Pontuação de experiência baseada em atividades (reviews: +10 XP, listas: +5 XP, follows: +1 XP), com níveis progressivos e benefícios desbloqueáveis.
- **Endpoints**: `GET /users/:username/stats`, `GET /stats/me`

**Integração com Clubes**:

- **Associação Transparente**: Listagem completa de clubes do usuário, diferenciando entre proprietário, moderador, e membro comum.
- **Privacidade por Contexto**: Clubes privados aparecem apenas para o próprio usuário, enquanto públicos são visíveis para todos.
- **Atividade Consolidada**: Estatísticas agregadas de participação em clubes (posts feitos, eventos organizados, sugestões aceitas).
- **Endpoint**: `GET /users/:username/clubs`

### 3. Sistema de Mídia

O núcleo da plataforma reside no robusto sistema de gerenciamento de mídia, que combina descoberta inteligente com integração profunda de metadados externos.

**Descoberta de Mídia Avançada**:

- **Filtros Multidimensionais**: Pesquisa por gênero (mais de 20 categorias), ano de lançamento (range flexível), classificação indicativa, duração, idioma original, país de origem.
- **Ordenação Inteligente**: Por popularidade (TMDB score + atividade local), avaliação média, data de lançamento, trending (algoritmo proprietário baseado em atividade recente).
- **Tendências Dinâmicas**: Análise em tempo real de padrões de visualização, com atualização horária de rankings.
- **Lançamentos Futuros**: Calendário de estreias com alertas personalizáveis e integração com calendários externos.
- **Endpoints**: `GET /media/discover`, `GET /media/trending`, `GET /media/popular`, `GET /media/top-rated`, `GET /media/upcoming`

**Integração Profunda com TMDB**:

- **Importação Automática**: Sistema de cache inteligente que importa metadados sob demanda, evitando duplicação e mantendo dados atualizados.
- **Mapeamento Abrangente**: Captura completa de informações incluindo elenco, equipe técnica, trailers, posters, backdrops, sinopses traduzidas, e dados técnicos (resolução, áudio, etc.).
- **Preview sem Importação**: Visualização de metadados sem poluir o banco local, útil para descoberta rápida.
- **Sincronização Incremental**: Atualização automática de dados quando TMDB lança novas informações ou correções.
- **Endpoints**: `POST /media/import`, `POST /media/import/batch`, `GET /media/tmdb/:tmdbId/preview`

**Biblioteca Local Otimizada**:

- **Slugs Semânticos**: URLs amigáveis geradas automaticamente (ex: "the-dark-knight-2008") com resolução de conflitos.
- **Indexação Full-Text**: Busca avançada em títulos, sinopses, diretores, atores, com relevância ponderada.
- **Categorização Automática**: Tags inteligentes baseadas em gêneros TMDB e análise de conteúdo.
- **Cache de Performance**: Metadados frequentemente acessados mantidos em cache Redis para resposta sub-100ms.
- **Endpoints**: `GET /media/library`, `GET /media/slug/:slug`, `GET /media/:id`

**Sistema de Recomendações Inteligente**:

- **Algoritmo Híbrido**: Combinação de similaridade TMDB com comportamento do usuário (reviews similares, listas compartilhadas, padrões de gosto).
- **Recomendações Contextuais**: Sugestões baseadas em mídia recentemente assistida, temporada atual, ou perfil demográfico.
- **Diversificação**: Evita recomendações repetitivas através de algoritmos de diversidade que consideram gêneros, décadas, e regiões.
- **Feedback Loop**: Aprendizado contínuo baseado em aceitação/rejeição de recomendações.
- **Endpoints**: `GET /media/tmdb/:tmdbId/recommendations`, `GET /media/tmdb/:tmdbId/similar`

### 4. Sistema de Reviews e Avaliações

O sistema de reviews representa a voz da comunidade, oferecendo uma plataforma rica para crítica cinematográfica e descoberta de opiniões.

**Criação e Gerenciamento de Reviews**:

- **Conteúdo Estruturado**: Reviews com título opcional, corpo de texto rico (markdown suportado), indicação de spoilers, e avaliação numérica (1-10 estrelas).
- **Validações Inteligentes**: Detecção automática de spoilers, limite de comprimento (máximo 5000 caracteres), e verificação de originalidade básica.
- **Edição Temporal**: Janela de 24 horas para edição após publicação, com histórico de versões para transparência.
- **Sistema de Likes**: Curtidas em reviews com contador público e notificações para autores.
- **Moderação Automática**: Filtros de conteúdo impróprio com escalação para moderação humana quando necessário.
- **Endpoints**: `POST /reviews`, `PATCH /reviews/:id`, `DELETE /reviews/:id`, `POST /reviews/:id/like`, `DELETE /reviews/:id/like`

**Listagem e Descoberta de Reviews**:

- **Ordenação Flexível**: Por data, popularidade (likes + comentários), relevância, ou avaliação.
- **Filtragem Avançada**: Por usuário, mídia específica, range de avaliação, presença de spoilers.
- **Paginação Otimizada**: Sistema de cursor para navegação eficiente em grandes volumes.
- **Reviews em Contexto**: Visualização integrada com detalhes da mídia e perfil do autor.
- **Endpoints**: `GET /reviews`, `GET /reviews/:id`, `GET /media/:id/reviews`

**Sistema de Avaliações Quantitativas**:

- **Avaliação Granular**: Sistema de estrelas (1-10) com meia-estrela para precisão.
- **Média Dinâmica**: Recálculo automático da avaliação média da mídia baseado em todas as avaliações válidas.
- **Histórico Pessoal**: Rastreamento de mudanças de opinião com timestamps.
- **Integração com TMDB**: Sincronização opcional de avaliações com conta TMDB do usuário.
- **Endpoints**: `GET /ratings`, `POST /ratings`, `DELETE /ratings/:mediaId`

### 5. Sistema de Listas

As listas representam curadoria pessoal e coletiva, permitindo que usuários organizem e compartilhem suas descobertas cinematográficas.

**Criação de Listas Personalizadas**:

- **Configuração Flexível**: Listas públicas (descobríveis) ou privadas, com títulos descritivos e descrições detalhadas.
- **Ordenação Manual**: Capacidade de reordenar itens por arrastar-e-soltar ou API específica.
- **Categorização**: Tags customizáveis para organização pessoal (ex: "para-assistir", "clássicos", "favoritos-ano").
- **Limites por Plano**: Usuários gratuitos podem criar até 10 listas, premium ilimitado.
- **Endpoints**: `POST /lists`, `PATCH /lists/:id`, `DELETE /lists/:id`

**Gerenciamento de Itens**:

- **Adição Inteligente**: Sugestões automáticas baseadas em padrões do usuário e popularidade geral.
- **Validação de Unicidade**: Prevenção de duplicatas na mesma lista.
- **Metadados de Item**: Notas pessoais, data de adição, e ordem customizável.
- **Endpoints**: `POST /lists/:id/items`, `DELETE /lists/:id/items/:mediaId`

**Descoberta e Exploração**:

- **Algoritmo de Descoberta**: Listas populares aparecem no feed baseado em engajamento e relevância.
- **Busca Avançada**: Filtros por criador, categoria, tamanho da lista, e data de criação.
- **Interação Social**: Capacidade de seguir listas e receber notificações de atualizações.
- **Endpoints**: `GET /lists`, `GET /lists/:id`

### 6. Watchlist e Diário

Sistemas complementares para planejamento e registro de consumo audiovisual.

**Watchlist Pessoal**:

- **Organização Inteligente**: Separação automática entre filmes e séries, com prioridades e datas desejadas.
- **Integração com Descoberta**: Adição direta de resultados de busca ou recomendações.
- **Lembretes**: Notificações quando mídia desejada fica disponível em plataformas de streaming.
- **Endpoints**: `GET /watchlist`, `POST /watchlist`, `DELETE /watchlist/:mediaId`

**Diário de Assistidos**:

- **Registro Detalhado**: Data, horário, duração da sessão, dispositivo usado, e notas pessoais.
- **Rastreamento Automático**: Integração opcional com players externos para logging automático.
- **Análise de Hábitos**: Relatórios mensais de padrões de visualização e preferências.
- **Endpoints**: `GET /diary`, `POST /diary`

**Progresso em Séries**:

- **Rastreamento Granular**: Por episódio individual com timestamps de início/fim.
- **Sincronização**: Capacidade de importar progresso de outras plataformas.
- **Estatísticas de Série**: Tempo total investido, episódios restantes, ritmo de visualização.
- **Endpoints**: `GET /series/:id/seasons`, `GET /series/:id/seasons/:seasonNumber`, `POST /series/:id/episodes/:episodeId/watch`, `DELETE /series/:id/episodes/:episodeId/watch`, `GET /series/:id/progress`

### 7. Sistema de Gamificação

Elemento motivacional que transforma o engajamento passivo em participação ativa.

**Sistema de XP e Níveis**:

- **Pontuação Granular**: XP por atividade (review: 10pts, lista criada: 5pts, follow: 1pt, like recebido: 2pts).
- **Progressão de Níveis**: 50 níveis com recompensas desbloqueáveis (badges, early access, limites aumentados).
- **Multiplicadores**: Bônus por streaks diários, marcos mensais, e participação em eventos especiais.
- **Endpoints**: `GET /gamification/xp-history`, `GET /gamification/leaderboard`

**Conquistas (Achievements)**:

- **Sistema Abrangente**: Mais de 100 achievements categorizados (descobridor, crítico, social, colecionador).
- **Desbloqueio Progressivo**: Alguns achievements requerem sequências específicas de ações.
- **Recompensas Visuais**: Badges no perfil, destaque no leaderboard, e menções especiais.
- **Endpoint**: `GET /gamification/achievements`

### 8. Feed e Descoberta Social

Mecanismos para manter usuários engajados com conteúdo relevante e oportuno.

**Feed Personalizado**:

- **Algoritmo Sofisticado**: Combinação de relevância temporal, afinidade com criadores, e diversidade de conteúdo.
- **Segmentação**: Feeds separados para reviews, listas, atividade de clubes, e descobertas.
- **Controles de Privacidade**: Capacidade de silenciar usuários ou tipos de conteúdo.
- **Endpoint**: `GET /feed`

**Feed Global**:

- **Tendências em Tempo Real**: Atualização contínua baseada em atividade recente.
- **Diversidade Garantida**: Algoritmos que previnem bolhas de conteúdo e promovem descoberta.
- **Endpoint**: `GET /feed/global`

**Busca Unificada**:

- **Indexação Completa**: Mídia, usuários, listas, clubes, com pesos de relevância.
- **Correção Automática**: Sugestões de correção para termos similares.
- **Filtros Contextuais**: Resultados diferenciados por tipo com previews ricos.
- **Endpoint**: `GET /search`

### 9. Sistema de Comentários

Discussões estruturadas que enriquecem o ecossistema de conteúdo.

**Comentários Hierárquicos**:

- **Estrutura Aninhada**: Até 3 níveis de profundidade para conversas organizadas.
- **Rich Text**: Suporte a markdown básico, links, e menções a usuários.
- **Moderação**: Sistema automático de detecção de spam e toxicidade.
- **Endpoints**: `GET /comments`, `GET /comments/:id/replies`, `POST /comments`, `DELETE /comments/:id`

### 10. Sistema de Notificações

Comunicação em tempo real para manter usuários informados.

**Notificações Granulares**:

- **Tipos Diversificados**: Likes, follows, comentários, convites de clube, atualizações de listas.
- **Priorização Inteligente**: Classificação por urgência e relevância pessoal.
- **Canais Múltiplos**: In-app, email opcional, e integração futura com push notifications.
- **Endpoints**: `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /notifications/unread-count`

### 11. Sistema de Favoritos

Curadoria pessoal de conteúdo preferido.

**Favoritos Organizados**:

- **Reordenação**: Capacidade de priorizar itens através de drag-and-drop.
- **Categorização**: Tags pessoais para organização (ex: "must-watch", "guilty-pleasure").
- **Privacidade**: Favoritos podem ser públicos ou privados.
- **Endpoints**: `GET /favorites`, `POST /favorites`, `PUT /favorites/reorder`, `DELETE /favorites/:mediaId`

**Descoberta Social**:

- **Perfis Públicos**: Visualização de favoritos de outros usuários para descoberta.
- **Endpoint**: `GET /favorites/user/:username`

### 12. Sistema de Assinaturas e Pagamentos

Monetização sustentável com Stripe integration.

**Planos Estruturados**:

- **Tiers Progressivos**: Free (básico), Tier 1 (10$/mês), Tier 2 (20$/mês), Tier 3 (35$/mês).
- **Benefícios Escaláveis**: Limites de clubes, listas, armazenamento, prioridade no suporte.
- **Períodos de Teste**: 14 dias grátis para novos assinantes.
- **Endpoints**: `GET /plans`, `GET /plans/my-subscription`, `POST /plans/subscribe`

**Processamento Seguro**:

- **Checkout Otimizado**: Sessões Stripe com validação em tempo real.
- **Portal de Gerenciamento**: Auto-serviço para upgrades, downgrades, cancelamentos.
- **Webhooks Robustos**: Processamento assíncrono de eventos de pagamento.
- **Endpoints**: `POST /stripe/checkout`, `POST /stripe/portal`, `POST /stripe/webhook`

### 13. Privacidade e Conformidade

Compromisso com proteção de dados e transparência.

**Exportação de Dados**:

- **Conformidade GDPR/CCPA**: Exportação completa de todos os dados pessoais em formato JSON estruturado.
- **Inclusão Abrangente**: Perfis, histórico de atividade, conteúdo criado, dados de pagamento anonimizados.
- **Processamento Assíncrono**: Geração em background com notificação por email quando pronto.
- **Endpoint**: `GET /privacy/export`

**Exclusão de Conta**:

- **Processo em Duas Etapas**: Solicitação inicial seguida de confirmação por email.
- **Período de Graça**: 30 dias para reconsideração antes da exclusão permanente.
- **Limpeza Completa**: Remoção em cascata de todos os dados associados.
- **Endpoints**: `POST /privacy/request-deletion`, `DELETE /privacy/confirm-deletion`

**Consentimento Granular**:

- **Controles Detalhados**: Consentimento separado para analytics, marketing, compartilhamento de dados.
- **Auditoria**: Histórico completo de mudanças de consentimento.
- **Endpoint**: `GET /privacy/consent`

### 14. Administração e Moderação

Ferramentas para manter a saúde da plataforma.

**Painel Administrativo**:

- **Métricas em Tempo Real**: Usuários ativos, crescimento, engajamento, receita.
- **Gestão de Usuários**: Busca avançada, modificação de status, análise de comportamento.
- **Relatórios de Sistema**: Performance, erros, uso de recursos.
- **Endpoints**: `GET /admin/stats`, `GET /admin/user`, `PATCH /admin/user/:id/status`

**Sistema de Relatórios**:

- **Categorização**: Spam, assédio, conteúdo impróprio, violação de direitos autorais.
- **Workflow Estruturado**: Triagem automática, escalação para moderadores humanos, resolução documentada.
- **Acompanhamento**: Métricas de resolução e tempo médio de resposta.
- **Endpoints**: `GET /admin/reports`, `PATCH /admin/reports/:id/resolve`

### 15. Infraestrutura e Utilitários

Base técnica sólida para performance e segurança.

**Proxy de Imagens Otimizado**:

- **Cache Inteligente**: CDN-like com invalidação automática e compressão.
- **Transformações**: Resize dinâmico, formato otimizado, watermark opcional.
- **Endpoint**: `GET /images/*`

**Autenticação Robusta**:

- **Better Auth Integration**: Suporte a múltiplos provedores (Google, GitHub, Discord, etc.).
- **Sessões Seguras**: JWT com rotação automática e invalidação remota.
- **Middleware Global**: Aplicado automaticamente a todos os endpoints protegidos.

**Segurança em Camadas**:

- **Headers de Segurança**: CSP, HSTS, X-Frame-Options, e outros.
- **Rate Limiting**: Baseado em usuário e IP com algoritmos adaptativos.
- **Logging Abrangente**: Auditoria completa de todas as operações sensíveis.
- **CORS Restritivo**: Apenas origens autorizadas permitidas.

## Endpoints Detalhados

Para uma lista completa de todos os endpoints com métodos HTTP, caminhos e descrições, consulte a seção de análise de rotas acima.

## Tecnologias Utilizadas

- **Framework Principal**: Elysia (Bun) - Framework moderno e performático para APIs
- **Banco de Dados**: PostgreSQL com Drizzle ORM - SQL type-safe e otimizado
- **Autenticação**: Better Auth - Sistema completo de autenticação social
- **Armazenamento**: Backblaze B2 - Storage de objetos econômico e confiável
- **Pagamentos**: Stripe - Processamento seguro de pagamentos e assinaturas
- **Metadados**: The Movie Database (TMDB) API - Base de dados cinematográfica abrangente
- **Cache**: Redis (implicado) - Cache de alta performance para metadados e sessões
- **Validação**: TypeBox (integrado com Elysia) - Validação de schemas type-safe

## Limitações e Restrições

### Limites por Plano de Assinatura

- **Free**: 2 clubes, 10 listas, rate limit básico, sem prioridade no suporte
- **Tier 1**: 10 clubes, listas ilimitadas, rate limit aumentado, suporte prioritário
- **Tier 2**: 25 clubes, recursos premium, analytics avançados
- **Tier 3**: Clubes ilimitados, recursos enterprise, suporte dedicado

### Restrições Técnicas

- **Rate Limiting**: 1000 requests/hora para usuários gratuitos, 10000 para premium
- **Upload de Imagens**: Máximo 2MB por arquivo, formatos JPG/PNG/WebP
- **Comprimento de Texto**: Reviews limitadas a 5000 caracteres, biografias a 500
- **Profundidade de Comentários**: Máximo 3 níveis de aninhamento
- **Tamanho de Listas**: Até 1000 itens por lista
- **Convites de Clube**: Máximo 50 convites pendentes por usuário

### Regras de Negócio

- **Verificação de Conta**: Contas novas têm limites reduzidos por 30 dias
- **Moderação de Conteúdo**: Sistema automático filtra spam e conteúdo impróprio
- **Privacidade**: Dados sensíveis nunca são compartilhados sem consentimento explícito
- **Conformidade**: Total aderência a GDPR, CCPA e outras regulamentações de privacidade

## Performance e Escalabilidade

- **Cache Estratégico**: Metadados TMDB em cache Redis por 24 horas
- **CDN-like**: Proxy de imagens com compressão e otimização automática
- **Database Indexing**: Índices otimizados para buscas e filtros complexos
- **Background Jobs**: Processamento assíncrono para imports e notificações
- **Horizontal Scaling**: Arquitetura preparada para múltiplas instâncias

Esta documentação representa uma análise abrangente e detalhada de todas as funcionalidades implementadas na API PixelReel, fornecendo insights profundos sobre arquitetura, regras de negócio e capacidades técnicas da plataforma.</content>
<parameter name="filePath">e:\Projetos\pixelreel-reborn\API_DOCUMENTATION.md
