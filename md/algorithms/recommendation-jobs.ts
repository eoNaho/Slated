/**
 * services/recommendation-jobs.ts
 *
 * Jobs de manutenção do sistema de recomendação.
 * Rodados via cron (registrar em services/cron.ts).
 *
 *   precomputeSimilarityMatrix  → recalcula pares de usuários similares (noturno)
 *   invalidateStaleProfiles     → limpa perfis antigos (diário)
 *   warmRecommendationCache     → pré-aquece cache de usuários ativos (de hora em hora)
 */

import {
  db,
  user as userTable,
  follows,
  diary,
  userStats,
  eq,
  and,
  gte,
  desc,
  count,
  inArray,
  sql,
} from "../db";
import { userSimilarityCache, userTasteSnapshots } from "../db/schema/recommendations";
import { tasteProfileService } from "./recommendation.service";
import { logger } from "../utils/logger";

// ─── Pré-computar matriz de similaridade ──────────────────────────────────────

/**
 * Calcula os top 50 usuários mais similares para cada usuário ativo.
 * Roda à meia-noite — resultados ficam no cache por 24h.
 *
 * Estratégia "MinHash LSH simplificado":
 *  1. Para cada usuário, pegar quem assistiu filmes em comum (candidatos)
 *  2. Calcular cosine similarity do vetor de gênero
 *  3. Persistir pares com similarity > 0.3
 *
 * Complexidade: O(U × C × V) onde U = usuários ativos, C = candidatos médios,
 * V = tamanho do vetor. Na prática muito mais rápido que O(U²).
 */
export async function precomputeSimilarityMatrix(): Promise<void> {
  logger.info("recommendation-jobs: starting similarity matrix precomputation");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Somente usuários ativos nos últimos 30 dias e com ao menos 5 filmes
  const activeUsers = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        eq(userTable.status, "active"),
        gte(userTable.lastActiveAt, thirtyDaysAgo),
      )
    )
    .limit(5000); // limitar para não explodir

  logger.info({ count: activeUsers.length }, "Active users to process");

  let processed = 0;
  let pairs = 0;

  for (const { id: userId } of activeUsers) {
    try {
      const profile = await tasteProfileService.buildProfile(userId);

      if (profile.totalWatched < 5 || profile.genreVector.length === 0) {
        processed++;
        continue;
      }

      // Candidatos: usuários que assistiram filmes em comum (min 3)
      const watchedArray = [...profile.watchedMediaIds].slice(0, 100);
      if (watchedArray.length === 0) { processed++; continue; }

      const candidates = await db
        .select({ userId: diary.userId, commonCount: count() })
        .from(diary)
        .where(
          and(
            inArray(diary.mediaId, watchedArray),
            sql`${diary.userId} != ${userId}`,
          )
        )
        .groupBy(diary.userId)
        .having(sql`COUNT(*) >= 3`)
        .orderBy(desc(count()))
        .limit(100);

      for (const { userId: candidateId, commonCount } of candidates) {
        const candidateProfile = await tasteProfileService.buildProfile(candidateId);
        if (candidateProfile.genreVector.length === 0) continue;

        // Alinhar ao mesmo espaço de gêneros
        const refIds   = profile.topGenres.map((g) => g.genreId);
        const srcMap   = new Map(candidateProfile.topGenres.map((g) => [g.genreId, Math.max(0, g.score)]));
        const mag = Math.sqrt(profile.genreVector.reduce((s, x) => s + x * x, 0));
        const myVec    = profile.genreVector;
        const otherVec = refIds.map((id) => srcMap.get(id) ?? 0);
        const otherMag = Math.sqrt(otherVec.reduce((s, x) => s + x * x, 0));

        let similarity = 0;
        if (mag > 0 && otherMag > 0) {
          const dot = myVec.reduce((s, v, i) => s + v * (otherVec[i] / otherMag), 0);
          similarity = dot / mag;
        }

        if (similarity > 0.3) {
          // Upsert par (sempre armazenar com userIdA < userIdB para evitar duplicatas)
          const [a, b] = userId < candidateId ? [userId, candidateId] : [candidateId, userId];
          await db
            .insert(userSimilarityCache)
            .values({
              userIdA:    a,
              userIdB:    b,
              similarity,
              commonMedia: Number(commonCount),
              computedAt:  new Date(),
            })
            .onConflictDoUpdate({
              target: [userSimilarityCache.userIdA, userSimilarityCache.userIdB],
              set: {
                similarity,
                commonMedia: Number(commonCount),
                computedAt:  new Date(),
              },
            });
          pairs++;
        }
      }

      processed++;
      if (processed % 100 === 0) {
        logger.info({ processed, total: activeUsers.length, pairs }, "Similarity matrix progress");
      }
    } catch (err) {
      logger.warn({ err, userId }, "Failed to process user in similarity matrix");
      processed++;
    }
  }

  logger.info({ processed, pairs }, "recommendation-jobs: similarity matrix done");
}

// ─── Invalidar perfis antigos ─────────────────────────────────────────────────

/**
 * Remove snapshots de perfil mais antigos que 24h.
 * Eles serão recalculados on-demand na próxima requisição.
 */
export async function invalidateStaleProfiles(): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await db
    .delete(userTasteSnapshots)
    .where(sql`${userTasteSnapshots.updatedAt} < ${cutoff}`)
    .returning({ userId: userTasteSnapshots.userId });

  logger.info({ count: result.length }, "recommendation-jobs: stale profiles invalidated");
}

// ─── Pre-aquecer cache dos mais ativos ────────────────────────────────────────

/**
 * Pré-calcula perfis e recomendações para os 100 usuários mais ativos.
 * Reduz latência na primeira request deles.
 */
export async function warmRecommendationCache(): Promise<void> {
  const topUsers = await db
    .select({ userId: userStats.userId })
    .from(userStats)
    .orderBy(desc(userStats.xp))
    .limit(100);

  let warmed = 0;
  for (const { userId } of topUsers) {
    try {
      await tasteProfileService.buildProfile(userId);
      warmed++;
    } catch {
      // Falhou — próximo
    }
  }

  logger.info({ warmed }, "recommendation-jobs: cache warmed");
}

// ─── Registrar no cron ────────────────────────────────────────────────────────

/**
 * Adicione ao services/cron.ts:
 *
 * import { precomputeSimilarityMatrix, invalidateStaleProfiles, warmRecommendationCache } from "./recommendation-jobs";
 *
 * registerJob("rec-similarity-matrix", 24 * 60 * 60 * 1000, precomputeSimilarityMatrix);
 * registerJob("rec-invalidate-profiles", 60 * 60 * 1000, invalidateStaleProfiles);
 * registerJob("rec-warm-cache", 60 * 60 * 1000, warmRecommendationCache);
 */
