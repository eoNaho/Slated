/**
 * Seed script for the word_blocklist table.
 * Run: bun run src/db/seed-blocklist.ts
 */
import { db, wordBlocklist } from ".";

const entries: {
  word: string;
  matchType: "exact" | "contains" | "regex";
  severity: "low" | "medium" | "high";
  category: "profanity" | "slur" | "spam" | "custom";
}[] = [
  // ── PT-BR profanity ────────────────────────────────────────────────────────
  { word: "porra", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "caralho", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "merda", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "foda", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "fodase", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "viado", matchType: "exact", severity: "high", category: "slur" },
  { word: "veado", matchType: "exact", severity: "high", category: "slur" },
  { word: "buceta", matchType: "contains", severity: "high", category: "profanity" },
  { word: "pau", matchType: "exact", severity: "low", category: "profanity" },
  { word: "cu", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "cuzao", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "cuzão", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "piroca", matchType: "contains", severity: "high", category: "profanity" },
  { word: "pica", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "otario", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "otário", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "arrombado", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "babaca", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "idiota", matchType: "exact", severity: "low", category: "profanity" },
  { word: "imbecil", matchType: "exact", severity: "low", category: "profanity" },
  { word: "cretino", matchType: "exact", severity: "low", category: "profanity" },
  { word: "vagabunda", matchType: "contains", severity: "high", category: "slur" },
  { word: "vadia", matchType: "exact", severity: "high", category: "slur" },
  { word: "puta", matchType: "contains", severity: "high", category: "slur" },
  { word: "negro", matchType: "exact", severity: "low", category: "profanity" },
  { word: "macaco", matchType: "exact", severity: "medium", category: "slur" },
  { word: "bicha", matchType: "exact", severity: "high", category: "slur" },
  { word: "traveco", matchType: "exact", severity: "high", category: "slur" },
  { word: "gordo", matchType: "exact", severity: "low", category: "profanity" },
  { word: "retardado", matchType: "contains", severity: "medium", category: "slur" },
  { word: "neguinho", matchType: "contains", severity: "high", category: "slur" },
  { word: "preto safado", matchType: "contains", severity: "high", category: "slur" },
  { word: "crioulo", matchType: "exact", severity: "high", category: "slur" },
  { word: "judeu", matchType: "exact", severity: "low", category: "profanity" },
  { word: "jumento", matchType: "exact", severity: "low", category: "profanity" },
  { word: "lazarento", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "miserável", matchType: "exact", severity: "low", category: "profanity" },
  { word: "lixo", matchType: "exact", severity: "low", category: "profanity" },
  { word: "escoria", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "escória", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "filho da puta", matchType: "contains", severity: "high", category: "profanity" },
  { word: "vai tomar no cu", matchType: "contains", severity: "high", category: "profanity" },
  { word: "vai se foder", matchType: "contains", severity: "high", category: "profanity" },
  { word: "caga", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "bosta", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "safado", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "fdp", matchType: "exact", severity: "high", category: "profanity" },
  { word: "fds", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "qsf", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "tnc", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "vsf", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "stnc", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "krl", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "pqp", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "mlk safado", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "desgraçado", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "desgraçada", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "vagal", matchType: "exact", severity: "low", category: "profanity" },
  { word: "xexeu", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "xoxota", matchType: "contains", severity: "high", category: "profanity" },

  // ── EN profanity ───────────────────────────────────────────────────────────
  { word: "fuck", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "shit", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "asshole", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "bitch", matchType: "contains", severity: "medium", category: "profanity" },
  { word: "cunt", matchType: "contains", severity: "high", category: "profanity" },
  { word: "cock", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "dick", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "pussy", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "bastard", matchType: "exact", severity: "low", category: "profanity" },
  { word: "retard", matchType: "exact", severity: "high", category: "slur" },
  { word: "faggot", matchType: "contains", severity: "high", category: "slur" },
  { word: "fag", matchType: "exact", severity: "high", category: "slur" },
  { word: "nigger", matchType: "contains", severity: "high", category: "slur" },
  { word: "nigga", matchType: "contains", severity: "high", category: "slur" },
  { word: "spic", matchType: "exact", severity: "high", category: "slur" },
  { word: "chink", matchType: "exact", severity: "high", category: "slur" },
  { word: "kike", matchType: "exact", severity: "high", category: "slur" },
  { word: "wetback", matchType: "exact", severity: "high", category: "slur" },
  { word: "tranny", matchType: "exact", severity: "high", category: "slur" },
  { word: "whore", matchType: "exact", severity: "high", category: "slur" },
  { word: "slut", matchType: "exact", severity: "high", category: "slur" },
  { word: "motherfucker", matchType: "contains", severity: "high", category: "profanity" },
  { word: "cocksucker", matchType: "contains", severity: "high", category: "profanity" },
  { word: "wtf", matchType: "exact", severity: "low", category: "profanity" },
  { word: "stfu", matchType: "exact", severity: "low", category: "profanity" },
  { word: "gtfo", matchType: "exact", severity: "medium", category: "profanity" },
  { word: "kys", matchType: "exact", severity: "high", category: "profanity" },
  { word: "kill yourself", matchType: "contains", severity: "high", category: "profanity" },
  { word: "go kill yourself", matchType: "contains", severity: "high", category: "profanity" },

  // ── Spam patterns (regex) ─────────────────────────────────────────────────
  {
    word: "\\b(buy|cheap|free|discount|offer|deal|click here|act now|limited time)\\b.{0,30}\\b(http|www|bit\\.ly)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "\\b(crypto|bitcoin|eth|nft|invest|profit|earn)\\b.{0,30}\\b(guaranteed|passive income|100x|moon|pump)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "follow (me|us) (back|for|on) (instagram|tiktok|twitter|youtube)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "\\b(dm me|direct message|whatsapp|telegram)\\b.{0,40}\\b(deal|offer|price|buy|sell)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "\\b(password|senha|login|account|credit card|cartão de crédito)\\b.{0,30}\\b(verify|verificar|confirm|click|clique)",
    matchType: "regex",
    severity: "high",
    category: "spam",
  },
  {
    word: "(discord\\.gg|t\\.me|wa\\.me)\\/[a-zA-Z0-9]+",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "\\b(subscribe|inscrevam|inscreva-se)\\b.{0,30}\\b(my channel|meu canal|youtube\\.com\\/)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "make (money|\\$|cash) (fast|now|online|working from home)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
  {
    word: "\\b(onlyfans|of\\.com|fansly)\\.com",
    matchType: "regex",
    severity: "high",
    category: "spam",
  },
  {
    word: "(\\+\\d{10,15}|\\(\\d{2,3}\\)\\s?\\d{4,5}-\\d{4}).{0,20}(whatsapp|telegram|signal)",
    matchType: "regex",
    severity: "medium",
    category: "spam",
  },
];

async function main() {
  console.log(`Seeding ${entries.length} blocklist entries...`);

  const inserted = await db
    .insert(wordBlocklist)
    .values(entries)
    .onConflictDoNothing()
    .returning({ id: wordBlocklist.id, word: wordBlocklist.word });

  console.log(`Inserted ${inserted.length} new entries (skipped ${entries.length - inserted.length} duplicates).`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
