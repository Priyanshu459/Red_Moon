import { MediaItem, RecommendationMatch, UserHistoryRecord } from '../types/media';
import { cleanMediaTitle } from '../utils/mediaFormatter';

const STORAGE_KEY = 'redmoon_recommendations_v1';

interface RecommendationStorage {
  history: Record<string, UserHistoryRecord>;
  likes: string[];
  myList: string[];
}

class RecommendationService {
  private data: RecommendationStorage;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): RecommendationStorage {
    if (typeof window === 'undefined') {
      return { history: {}, likes: [], myList: [] };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          history: parsed.history || {},
          likes: Array.isArray(parsed.likes) ? parsed.likes : [],
          myList: Array.isArray(parsed.myList) ? parsed.myList : [],
        };
      }
    } catch {
      // ignore JSON errors
    }
    return { history: {}, likes: [], myList: [] };
  }

  private saveData(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore storage quota errors
    }
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  // --- Telemetry & Interaction Actions ---

  public recordPlay(item: MediaItem): void {
    const existing = this.data.history[item.id] || {
      id: item.id,
      lastPlayed: 0,
      playCount: 0,
      completionRatio: 0,
    };

    this.data.history[item.id] = {
      ...existing,
      lastPlayed: Date.now(),
      playCount: existing.playCount + 1,
    };
    this.saveData();
  }

  public recordCompletion(id: string, ratio: number): void {
    const existing = this.data.history[id];
    if (existing) {
      existing.completionRatio = Math.max(existing.completionRatio, Math.min(1, ratio));
      this.saveData();
    }
  }

  public toggleLike(id: string): boolean {
    const idx = this.data.likes.indexOf(id);
    let isNowLiked = false;
    if (idx >= 0) {
      this.data.likes.splice(idx, 1);
    } else {
      this.data.likes.push(id);
      isNowLiked = true;
    }
    this.saveData();
    return isNowLiked;
  }

  public isLiked(id: string): boolean {
    return this.data.likes.includes(id);
  }

  public toggleMyList(id: string): boolean {
    const idx = this.data.myList.indexOf(id);
    let isNowInList = false;
    if (idx >= 0) {
      this.data.myList.splice(idx, 1);
    } else {
      this.data.myList.push(id);
      isNowInList = true;
    }
    this.saveData();
    return isNowInList;
  }

  public isInMyList(id: string): boolean {
    return this.data.myList.includes(id);
  }

  public getMyList(allItems: MediaItem[]): MediaItem[] {
    const map = new Map<string, MediaItem>(allItems.map((i) => [i.id, i]));
    return this.data.myList
      .map((id) => map.get(id))
      .filter((item): item is MediaItem => Boolean(item));
  }

  // --- Similarity & Recommendation Algorithms ---

  /**
   * Computes a normalized similarity coefficient (0.0 to 1.0) between two media items.
   */
  public computeSimilarity(a: MediaItem, b: MediaItem): number {
    if (a.id === b.id) return 1.0;

    let score = 0;

    // 1. Media Type Affinity (Video vs Audio)
    if (a.type === b.type) score += 0.35;

    // 2. Folder Origin Affinity (Items stored together have semantic context)
    if (a.folder === b.folder) score += 0.25;

    // 3. Category Tag Affinity
    const parsedA = cleanMediaTitle(a.name || a.title);
    const parsedB = cleanMediaTitle(b.name || b.title);
    if (parsedA.categoryTag && parsedB.categoryTag) {
      if (parsedA.categoryTag.toLowerCase() === parsedB.categoryTag.toLowerCase()) {
        score += 0.25;
      }
    }

    // 4. Keyword / Title token intersection
    const tokenize = (str: string) =>
      str
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !['the', 'and', 'with', 'for', 'wav', 'mp4', 'mp3'].includes(w));

    const tokensA = new Set(tokenize(parsedA.title));
    const tokensB = tokenize(parsedB.title);
    let tokenMatches = 0;
    for (const t of tokensB) {
      if (tokensA.has(t)) tokenMatches++;
    }

    if (tokenMatches > 0) {
      score += Math.min(0.25, tokenMatches * 0.12);
    }

    // 5. File Extension format consistency
    if (a.ext === b.ext) score += 0.05;

    return Math.min(1.0, score);
  }

  /**
   * Generates aggregated recommendation feeds for UI consumption.
   */
  public getRecommendations(allItems: MediaItem[]): {
    topPicks: RecommendationMatch[];
    becauseYouWatched: { sourceItem: MediaItem; recommendations: RecommendationMatch[] } | null;
  } {
    return {
      topPicks: this.getTopPicks(allItems),
      becauseYouWatched: this.getBecauseYouWatched(allItems),
    };
  }

  /**
   * Computes a Netflix-grade percentage match score (82% to 99%) for a given item.
   */
  public calculateMatchScore(item: MediaItem, allItems: MediaItem[]): number {
    let baseScore = 84;

    // Stable seed from item ID so scores are consistent
    let hash = 0;
    for (let i = 0; i < item.id.length; i++) {
      hash = (hash << 5) - hash + item.id.charCodeAt(i);
      hash |= 0;
    }
    const seedBonus = Math.abs(hash % 9); // 0 to 8
    baseScore += seedBonus;

    // User interaction bonuses
    if (this.isLiked(item.id)) baseScore += 8;
    if (this.isInMyList(item.id)) baseScore += 5;

    const hist = this.data.history[item.id];
    if (hist) {
      if (hist.playCount > 0) baseScore += Math.min(6, hist.playCount * 2);
      if (hist.completionRatio > 0.7) baseScore += 4;
    }

    // Compare with most recently played items for taste correlation
    const recentHistory = Object.values(this.data.history)
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, 3);

    if (recentHistory.length > 0) {
      const itemMap = new Map<string, MediaItem>(allItems.map((i) => [i.id, i]));
      for (const h of recentHistory) {
        const recentItem = itemMap.get(h.id);
        if (recentItem) {
          const sim = this.computeSimilarity(item, recentItem);
          baseScore += Math.round(sim * 6);
        }
      }
    }

    // Clamp between 82% and 99% (standard Netflix match range)
    return Math.max(82, Math.min(99, baseScore));
  }

  /**
   * Generates "Top Picks For You" recommendations sorted by calculated match score.
   */
  public getTopPicks(allItems: MediaItem[], limit = 10): RecommendationMatch[] {
    const scored = allItems.map((item) => {
      const score = this.calculateMatchScore(item, allItems);
      let reason = 'Based on your overall library affinity';
      if (this.isLiked(item.id)) reason = 'You liked this title';
      else if (this.isInMyList(item.id)) reason = 'Saved in your Watchlist';
      else if (score >= 95) reason = 'Exceptional 95%+ Match for your taste';
      else if (score >= 90) reason = 'Trending pick from your local vault';

      return {
        item,
        matchScore: score,
        reason,
      };
    });

    // Sort descending by match score
    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }

  /**
   * Generates "Because You Watched [Title]" recommendations.
   */
  public getBecauseYouWatched(
    allItems: MediaItem[]
  ): { sourceItem: MediaItem; recommendations: RecommendationMatch[] } | null {
    if (allItems.length <= 1) return null;

    // Find the most recently played item, or fallback to the first item
    const recentHistory = Object.values(this.data.history).sort((a, b) => b.lastPlayed - a.lastPlayed);

    let sourceItem: MediaItem | null = null;
    const itemMap = new Map<string, MediaItem>(allItems.map((i) => [i.id, i]));

    for (const h of recentHistory) {
      const found = itemMap.get(h.id);
      if (found) {
        sourceItem = found;
        break;
      }
    }

    if (!sourceItem) {
      // Fallback: pick the first video or first audio item
      sourceItem = allItems.find((i) => i.type === 'video') || allItems[0];
    }

    if (!sourceItem) return null;

    const source = sourceItem;
    // Compute similarity for all other items
    const candidates = allItems
      .filter((i) => i.id !== source.id)
      .map((item) => {
        const sim = this.computeSimilarity(source, item);
        const matchScore = Math.max(82, Math.min(99, Math.round(82 + sim * 17)));
        return {
          item,
          matchScore,
          reason: `Similar style and catalog context to ${cleanMediaTitle(source.name || source.title).title}`,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return {
      sourceItem: source,
      recommendations: candidates.slice(0, 10),
    };
  }

  /**
   * Finds items similar to a specific target item.
   */
  public getSimilarItems(target: MediaItem, allItems: MediaItem[], limit = 6): RecommendationMatch[] {
    return allItems
      .filter((i) => i.id !== target.id)
      .map((item) => ({
        item,
        matchScore: Math.round(80 + this.computeSimilarity(target, item) * 19),
        reason: 'Related content',
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  }
}

export const recommendationEngine = new RecommendationService();
