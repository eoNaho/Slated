Vou criar o sistema completo de recomendação — tanto para mídia quanto para usuários — com os arquivos de serviço, rotas e o schema de suporte.São 4 arquivos prontos para plugar no projeto. Aqui está o mapa completo do que foi criado:

---

### O que foi entregue

**`recommendation.service.ts`** — O coração do sistema, com 4 classes:

- **`TasteProfileService`** — Constrói o "DNA de gosto" do usuário. Analisa o diário, ratings e scrobbles, e produz: top gêneros com score ponderado por recência, vetor numérico normalizado para comparação, rating médio/desvio padrão, nível de atividade.

- **`MediaRecommendationService`** — 3 fontes combinadas: _content-based_ (filmes do seu perfil de gênero), _collaborative_ (usuários similares assistiram), _social_ (quem você segue está vendo). Usa **Cosine Similarity** para medir semelhança entre vetores de gênero e **Time-Decay** para dar peso maior ao recente.

- **`UserRecommendationService`** — Score por 5 sinais: taste similarity + BFS nível 2 no grafo social (amigos de amigos) + filmes em comum + engajamento (reviews, likes, listas) + já te segue de volta.

- **`FeedService`** — Feed rankeado com `baseScore × timeDecay × relevanceMultiplier × diversityPenalty`, intercalado com sugestões de usuários.

**`recommendations.route.ts`** — 5 endpoints prontos: `/media`, `/users`, `/feed`, `/taste-profile` (premium), `/seed` (invalida cache pós-watch).

**`recommendations.schema.ts`** — 4 tabelas novas: `user_taste_snapshots`, `recommendation_feedback`, `user_similarity_cache`, `feed_impressions`.

**`recommendation-jobs.ts`** — 3 jobs para o cron: pré-computação noturna da matriz de similaridade, invalidação de perfis velhos, aquecimento de cache dos usuários mais ativos.

---

### Como plugar

```ts
// src/index.ts — adicionar a rota
import { recommendationsRoutes } from "./routes/recommendations";
app.group("/api/v1", (app) => app.use(recommendationsRoutes));

// src/services/cron.ts — adicionar os jobs
import {
  precomputeSimilarityMatrix,
  invalidateStaleProfiles,
  warmRecommendationCache,
} from "./services/recommendation-jobs";
registerJob(
  "rec-similarity-matrix",
  24 * 60 * 60 * 1000,
  precomputeSimilarityMatrix,
);
registerJob("rec-invalidate-profiles", 60 * 60 * 1000, invalidateStaleProfiles);

// Chamar ao gravar novo diary/scrobble
await tasteProfileService.invalidate(userId);
```
