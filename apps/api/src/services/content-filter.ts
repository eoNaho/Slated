import { db, wordBlocklist, eq } from "../db";

interface BlocklistEntry {
  id: string;
  word: string;
  matchType: string;
  severity: string;
  isActive: boolean;
}

interface FilterMatch {
  type: "profanity" | "spam";
  severity: string;
  matchedTerms: string[];
}

export interface ContentFilterResult {
  flagged: boolean;
  matches: FilterMatch[];
  severity: "none" | "low" | "medium" | "high";
  shouldAutoHide: boolean;
}

const SEVERITY_ORDER: Record<string, number> = { none: 0, low: 1, medium: 2, high: 3 };

// Normalize: lowercase + strip accents + expand common leetspeak substitutions
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/@/g, "a")
    .replace(/4/g, "a")
    .replace(/3/g, "e")
    .replace(/1/g, "i")
    .replace(/0/g, "o")
    .replace(/5/g, "s");
}

class ContentFilterService {
  private blocklist: BlocklistEntry[] = [];
  private lastLoaded = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private async ensureBlocklistLoaded() {
    if (Date.now() - this.lastLoaded < this.CACHE_TTL) return;

    const rows = await db
      .select()
      .from(wordBlocklist)
      .where(eq(wordBlocklist.isActive, true));

    this.blocklist = rows;
    this.lastLoaded = Date.now();
  }

  private matchWord(normalizedText: string, entry: BlocklistEntry): boolean {
    const term = normalize(entry.word);

    try {
      if (entry.matchType === "regex") {
        return new RegExp(term, "i").test(normalizedText);
      } else if (entry.matchType === "contains") {
        return normalizedText.includes(term);
      } else {
        // exact: match as whole word
        return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(normalizedText);
      }
    } catch {
      return false;
    }
  }

  private detectSpamPatterns(text: string): { flagged: boolean; reasons: string[] } {
    const reasons: string[] = [];

    // Repeated characters (6+ in a row)
    if (/(.)\1{5,}/.test(text)) reasons.push("repeated_chars");

    // Excessive ALL CAPS (>70% uppercase in texts > 20 chars)
    if (text.length > 20) {
      const letters = text.replace(/[^a-zA-Z]/g, "");
      const upper = letters.replace(/[^A-Z]/g, "");
      if (letters.length > 0 && upper.length / letters.length > 0.7) {
        reasons.push("excessive_caps");
      }
    }

    // Multiple URLs (3+)
    const urlCount = (text.match(/https?:\/\/\S+/g) || []).length;
    if (urlCount >= 3) reasons.push("multiple_urls");

    // Same word repeated 5+ times
    const words = text.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    for (const w of words) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    for (const [w, freq] of wordFreq) {
      if (w.length > 3 && freq >= 5) {
        reasons.push("repeated_word");
        break;
      }
    }

    return { flagged: reasons.length > 0, reasons };
  }

  async check(text: string): Promise<ContentFilterResult> {
    await this.ensureBlocklistLoaded();

    const normalizedText = normalize(text);
    const matches: FilterMatch[] = [];

    // 1. Blocklist matching
    const matchedByEntry: Record<string, { severity: string; terms: string[] }> = {};
    for (const entry of this.blocklist) {
      if (this.matchWord(normalizedText, entry)) {
        const cat = entry.severity;
        if (!matchedByEntry[cat]) matchedByEntry[cat] = { severity: cat, terms: [] };
        matchedByEntry[cat].terms.push(entry.word);
      }
    }

    for (const [, { severity, terms }] of Object.entries(matchedByEntry)) {
      matches.push({ type: "profanity", severity, matchedTerms: terms });
    }

    // 2. Spam pattern detection
    const spamCheck = this.detectSpamPatterns(text);
    if (spamCheck.flagged) {
      matches.push({ type: "spam", severity: "medium", matchedTerms: spamCheck.reasons });
    }

    // Determine max severity
    let maxSeverity: "none" | "low" | "medium" | "high" = "none";
    for (const m of matches) {
      const s = m.severity as "low" | "medium" | "high";
      if (SEVERITY_ORDER[s] > SEVERITY_ORDER[maxSeverity]) maxSeverity = s;
    }

    return {
      flagged: matches.length > 0,
      matches,
      severity: maxSeverity,
      shouldAutoHide: maxSeverity === "high",
    };
  }

  invalidateCache() {
    this.lastLoaded = 0;
  }
}

export const contentFilterService = new ContentFilterService();
