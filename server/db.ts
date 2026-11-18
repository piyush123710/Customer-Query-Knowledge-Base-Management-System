import fs from 'fs';
import path from 'path';
import type {
  Article,
  ArticleStatus,
  ArticleType,
  CategorySummary,
  QueryPriority,
  QueryStatus,
  SuggestResponse,
  SupportCategory,
  SupportQuery,
} from '../src/types.ts';
import { createSeedArticles, createSeedQueries } from './seedData.ts';

interface StoreSchema {
  articles: Article[];
  queries: SupportQuery[];
  lastTicketSeq: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'kb_store.json');

const CATEGORY_META: Record<SupportCategory, { prefix: string; description: string }> = {
  Hardware: {
    prefix: 'HW',
    description: 'Workstations, USB-C/Thunderbolt docks, displays, NVMe storage, power delivery, and peripherals.',
  },
  Software: {
    prefix: 'SW',
    description: 'Desktop clients, runtime libraries, updates, local databases, CLI tools, and exports.',
  },
  Network: {
    prefix: 'NW',
    description: 'Corporate VPN, split-DNS, Wi-Fi 6E, SSL/TLS proxies, switching, and API gateways.',
  },
  Account: {
    prefix: 'AC',
    description: 'SAML SSO, SCIM provisioning, MFA recovery, role permissions, and billing settings.',
  },
  Security: {
    prefix: 'SC',
    description: 'Device encryption, phishing response, endpoint EDR, webhook HMACs, and compliance.',
  },
};

const CATEGORY_KEYWORDS: Record<SupportCategory, { term: string; weight: number }[]> = {
  Hardware: [
    { term: 'monitor', weight: 3 },
    { term: 'display', weight: 2 },
    { term: '4k', weight: 2 },
    { term: 'dock', weight: 3 },
    { term: 'thunderbolt', weight: 4 },
    { term: 'usb-c', weight: 3 },
    { term: 'usb', weight: 2 },
    { term: 'charger', weight: 3 },
    { term: 'adapter', weight: 3 },
    { term: 'battery', weight: 4 },
    { term: 'power', weight: 2 },
    { term: 'nvme', weight: 4 },
    { term: 'ssd', weight: 4 },
    { term: 'ram', weight: 3 },
    { term: 'memory', weight: 2 },
    { term: 'bios', weight: 3 },
    { term: 'uefi', weight: 3 },
    { term: 'fan', weight: 3 },
    { term: 'thermal', weight: 3 },
    { term: 'overheating', weight: 3 },
    { term: 'keyboard', weight: 3 },
    { term: 'touchpad', weight: 3 },
    { term: 'trackpad', weight: 3 },
    { term: 'webcam', weight: 4 },
    { term: 'camera', weight: 3 },
    { term: 'printer', weight: 4 },
    { term: 'bluetooth', weight: 3 },
    { term: 'headset', weight: 3 },
    { term: 'raid', weight: 3 },
    { term: 'flicker', weight: 3 },
    { term: 'flickering', weight: 3 },
  ],
  Software: [
    { term: 'crash', weight: 3 },
    { term: 'crashes', weight: 3 },
    { term: 'freeze', weight: 3 },
    { term: 'freezes', weight: 3 },
    { term: 'dll', weight: 4 },
    { term: '0xc000007b', weight: 5 },
    { term: 'update', weight: 2 },
    { term: 'updater', weight: 4 },
    { term: 'installer', weight: 3 },
    { term: 'msi', weight: 4 },
    { term: 'export', weight: 3 },
    { term: 'csv', weight: 3 },
    { term: 'xlsx', weight: 3 },
    { term: 'pdf', weight: 2 },
    { term: 'sqlite', weight: 4 },
    { term: 'plugin', weight: 4 },
    { term: 'extension', weight: 3 },
    { term: 'cli', weight: 3 },
    { term: 'dpi', weight: 3 },
    { term: 'blurry', weight: 3 },
    { term: 'blank screen', weight: 3 },
    { term: 'white screen', weight: 3 },
    { term: 'logs', weight: 2 },
    { term: 'rollback', weight: 3 },
    { term: 'downgrade', weight: 3 },
    { term: 'cpu', weight: 2 },
    { term: 'heap', weight: 3 },
    { term: 'paste', weight: 2 },
  ],
  Network: [
    { term: 'vpn', weight: 4 },
    { term: 'dns', weight: 4 },
    { term: 'nxdomain', weight: 5 },
    { term: 'wifi', weight: 4 },
    { term: 'wi-fi', weight: 4 },
    { term: '6ghz', weight: 4 },
    { term: 'ssid', weight: 4 },
    { term: 'ethernet', weight: 4 },
    { term: 'packet loss', weight: 4 },
    { term: 'latency', weight: 3 },
    { term: 'ping', weight: 3 },
    { term: 'dhcp', weight: 4 },
    { term: '169.254', weight: 5 },
    { term: 'apipa', weight: 5 },
    { term: 'proxy', weight: 3 },
    { term: 'firewall', weight: 3 },
    { term: 'port', weight: 2 },
    { term: 'websocket', weight: 4 },
    { term: 'cors', weight: 4 },
    { term: 'mtu', weight: 4 },
    { term: '429', weight: 4 },
    { term: 'rate limit', weight: 3 },
    { term: 'ipv6', weight: 4 },
    { term: 'smb', weight: 3 },
    { term: 'nas', weight: 3 },
    { term: 'ssh', weight: 3 },
    { term: 'err_cert', weight: 4 },
    { term: 'tls', weight: 2 },
    { term: 'ssl', weight: 2 },
  ],
  Account: [
    { term: 'sso', weight: 4 },
    { term: 'saml', weight: 5 },
    { term: 'scim', weight: 5 },
    { term: 'okta', weight: 4 },
    { term: 'entra', weight: 4 },
    { term: 'aadsts', weight: 5 },
    { term: 'mfa', weight: 4 },
    { term: '2fa', weight: 4 },
    { term: 'authenticator', weight: 4 },
    { term: 'locked out', weight: 4 },
    { term: 'password', weight: 3 },
    { term: 'login', weight: 3 },
    { term: 'sign in', weight: 3 },
    { term: 'role', weight: 3 },
    { term: 'permission', weight: 3 },
    { term: 'permissions', weight: 3 },
    { term: '403', weight: 3 },
    { term: '401', weight: 3 },
    { term: 'owner', weight: 3 },
    { term: 'billing', weight: 4 },
    { term: 'invoice', weight: 4 },
    { term: 'seat', weight: 3 },
    { term: 'license', weight: 3 },
    { term: 'yubikey', weight: 4 },
    { term: 'passkey', weight: 4 },
    { term: 'session', weight: 3 },
    { term: 'email', weight: 2 },
    { term: 'suspended', weight: 3 },
  ],
  Security: [
    { term: 'phishing', weight: 5 },
    { term: 'spoof', weight: 4 },
    { term: 'bitlocker', weight: 5 },
    { term: 'filevault', weight: 5 },
    { term: 'recovery key', weight: 4 },
    { term: 'encryption', weight: 4 },
    { term: 'edr', weight: 4 },
    { term: 'antivirus', weight: 4 },
    { term: 'malware', weight: 4 },
    { term: 'quarantine', weight: 4 },
    { term: 'leaked', weight: 4 },
    { term: 'secret', weight: 3 },
    { term: 'api key', weight: 3 },
    { term: 'soc 2', weight: 4 },
    { term: 'iso 27001', weight: 4 },
    { term: 'compliance', weight: 3 },
    { term: 'vulnerability', weight: 4 },
    { term: 'webhook', weight: 3 },
    { term: 'hmac', weight: 5 },
    { term: 'csp', weight: 4 },
    { term: 'smartscreen', weight: 4 },
    { term: 'defender', weight: 3 },
    { term: 'dlp', weight: 4 },
    { term: 'unrecognized login', weight: 5 },
    { term: 'foreign ip', weight: 4 },
    { term: 'sanitize', weight: 3 },
    { term: 'har', weight: 3 },
  ],
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

class KnowledgeBaseStore {
  private data: StoreSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): StoreSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as StoreSchema;
        if (
          Array.isArray(parsed.articles) &&
          parsed.articles.length > 0 &&
          Array.isArray(parsed.queries)
        ) {
          return parsed;
        }
      }
    } catch {
      // Fallback to fresh seed if store file is malformed
    }

    const articles = createSeedArticles();
    const queries = createSeedQueries(articles);
    const seeded: StoreSchema = {
      articles,
      queries,
      lastTicketSeq: 1050,
    };
    this.persist(seeded);
    return seeded;
  }

  private persist(next?: StoreSchema): void {
    const target = next ?? this.data;
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(target, null, 2), 'utf-8');
  }

  public scoreArticle(article: Article, query: string): number {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return 1;
    const tokens = normalized.split(/\s+/).filter((t) => t.length > 1);
    if (tokens.length === 0) return 1;

    let score = 0;
    const title = article.title.toLowerCase();
    const code = article.code.toLowerCase();
    const summary = article.summary.toLowerCase();
    const overview = article.overview.toLowerCase();
    const subcat = article.subcategory.toLowerCase();
    const keywords = article.keywords.join(' ').toLowerCase();
    const errorCodes = article.errorCodes.join(' ').toLowerCase();
    const steps = article.steps.join(' ').toLowerCase();

    if (code === normalized) score += 100;
    if (title.includes(normalized)) score += 35;
    if (errorCodes.includes(normalized)) score += 30;
    if (summary.includes(normalized)) score += 15;

    for (const token of tokens) {
      if (title.includes(token)) score += 10;
      if (errorCodes.includes(token)) score += 12;
      if (keywords.includes(token)) score += 8;
      if (subcat.includes(token)) score += 6;
      if (summary.includes(token)) score += 5;
      if (overview.includes(token)) score += 3;
      if (steps.includes(token)) score += 2;
    }

    return score;
  }

  public queryArticles(params: {
    q?: string;
    category?: string;
    type?: string;
    status?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }) {
    const q = (params.q ?? '').trim();
    const category = params.category && params.category !== 'All' ? params.category : null;
    const type = params.type && params.type !== 'all' ? params.type : null;
    const status = params.status && params.status !== 'all' ? params.status : null;
    const sort = params.sort ?? (q ? 'relevance' : 'views');

    const basePool = this.data.articles;
    const counts = {
      all: basePool.length,
      published: basePool.filter((a) => a.status === 'published').length,
      draft: basePool.filter((a) => a.status === 'draft').length,
      archived: basePool.filter((a) => a.status === 'archived').length,
      faq: basePool.filter((a) => a.type === 'faq').length,
      guide: basePool.filter((a) => a.type === 'guide').length,
    };

    let filtered = basePool.filter((a) => {
      if (category && a.category !== category) return false;
      if (type && a.type !== type) return false;
      if (status && a.status !== status) return false;
      return true;
    });

    if (q) {
      const scored = filtered
        .map((article) => ({
          article,
          score: this.scoreArticle(article, q),
        }))
        .filter((entry) => entry.score > 0);

      scored.sort((a, b) => {
        if (sort === 'views') return b.article.views - a.article.views;
        if (sort === 'helpful') return b.article.helpfulCount - a.article.helpfulCount;
        if (sort === 'recent') {
          return new Date(b.article.updatedAt).getTime() - new Date(a.article.updatedAt).getTime();
        }
        return b.score - a.score || b.article.views - a.article.views;
      });
      filtered = scored.map((entry) => entry.article);
    } else {
      filtered = [...filtered].sort((a, b) => {
        if (sort === 'helpful') {
          const ratioA = a.helpfulCount / Math.max(1, a.helpfulCount + a.notHelpfulCount);
          const ratioB = b.helpfulCount / Math.max(1, b.helpfulCount + b.notHelpfulCount);
          return ratioB - ratioA || b.helpfulCount - a.helpfulCount;
        }
        if (sort === 'recent') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        }
        if (sort === 'title') {
          return a.title.localeCompare(b.title);
        }
        return b.views - a.views;
      });
    }

    const total = filtered.length;
    const offset = Math.max(0, params.offset ?? 0);
    const limit = params.limit && params.limit > 0 ? params.limit : total || 200;
    const items = filtered.slice(offset, offset + limit);

    return { items, total, counts };
  }

  public getArticleById(id: string, incrementView = false): Article | null {
    const article = this.data.articles.find((a) => a._id === id || a.slug === id);
    if (!article) return null;
    if (incrementView) {
      article.views += 1;
      this.persist();
    }
    return article;
  }

  public createArticle(input: {
    title: string;
    type: ArticleType;
    category: SupportCategory;
    subcategory: string;
    summary: string;
    overview: string;
    steps: string[];
    errorCodes?: string[];
    keywords?: string[];
    status?: ArticleStatus;
    author?: string;
  }): Article {
    const prefix = CATEGORY_META[input.category].prefix;
    const existingCount = this.data.articles.filter((a) => a.category === input.category).length;
    const code = `KB-${prefix}-${String(existingCount + 1).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();
    const id = `art_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const created: Article = {
      _id: id,
      code,
      title: input.title.trim(),
      slug: slugify(input.title),
      type: input.type,
      category: input.category,
      subcategory: input.subcategory.trim() || 'General',
      summary: input.summary.trim(),
      overview: input.overview.trim() || input.summary.trim(),
      steps: input.steps.map((s) => s.trim()).filter(Boolean),
      errorCodes: (input.errorCodes ?? []).map((e) => e.trim()).filter(Boolean),
      keywords: (input.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
      helpfulCount: 0,
      notHelpfulCount: 0,
      views: 1,
      status: input.status ?? 'published',
      author: input.author?.trim() || 'Support Admin',
      updatedAt: nowIso,
      createdAt: nowIso,
    };

    this.data.articles.unshift(created);
    this.persist();
    return created;
  }

  public updateArticle(
    id: string,
    patch: Partial<
      Pick<
        Article,
        | 'title'
        | 'type'
        | 'category'
        | 'subcategory'
        | 'summary'
        | 'overview'
        | 'steps'
        | 'errorCodes'
        | 'keywords'
        | 'status'
        | 'author'
      >
    >
  ): Article | null {
    const idx = this.data.articles.findIndex((a) => a._id === id);
    if (idx === -1) return null;

    const current = this.data.articles[idx];
    const updated: Article = {
      ...current,
      ...patch,
      title: patch.title !== undefined ? patch.title.trim() : current.title,
      slug: patch.title !== undefined ? slugify(patch.title) : current.slug,
      summary: patch.summary !== undefined ? patch.summary.trim() : current.summary,
      overview: patch.overview !== undefined ? patch.overview.trim() : current.overview,
      subcategory: patch.subcategory !== undefined ? patch.subcategory.trim() : current.subcategory,
      steps:
        patch.steps !== undefined
          ? patch.steps.map((s) => s.trim()).filter(Boolean)
          : current.steps,
      errorCodes:
        patch.errorCodes !== undefined
          ? patch.errorCodes.map((e) => e.trim()).filter(Boolean)
          : current.errorCodes,
      keywords:
        patch.keywords !== undefined
          ? patch.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
          : current.keywords,
      updatedAt: new Date().toISOString(),
    };

    this.data.articles[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteArticle(id: string): boolean {
    const before = this.data.articles.length;
    this.data.articles = this.data.articles.filter((a) => a._id !== id);
    if (this.data.articles.length === before) return false;
    this.persist();
    return true;
  }

  public recordFeedback(id: string, helpful: boolean): Article | null {
    const article = this.data.articles.find((a) => a._id === id);
    if (!article) return null;
    if (helpful) {
      article.helpfulCount += 1;
    } else {
      article.notHelpfulCount += 1;
    }
    this.persist();
    return article;
  }

  public getCategoriesSummary(): CategorySummary[] {
    const categories: SupportCategory[] = [
      'Hardware',
      'Software',
      'Network',
      'Account',
      'Security',
    ];

    return categories.map((category) => {
      const catArticles = this.data.articles.filter((a) => a.category === category);
      const published = catArticles.filter((a) => a.status === 'published');
      const openQueries = this.data.queries.filter(
        (q) => q.category === category && q.status !== 'Resolved'
      ).length;
      const subcategories = Array.from(new Set(catArticles.map((a) => a.subcategory))).sort();

      return {
        category,
        description: CATEGORY_META[category].description,
        totalArticles: catArticles.length,
        publishedArticles: published.length,
        faqCount: published.filter((a) => a.type === 'faq').length,
        guideCount: published.filter((a) => a.type === 'guide').length,
        openQueries,
        totalViews: catArticles.reduce((sum, a) => sum + a.views, 0),
        subcategories,
      };
    });
  }

  public suggestForQuery(subject: string, description: string): SuggestResponse {
    const text = `${subject} ${description}`.toLowerCase();
    const scores: Record<SupportCategory, number> = {
      Hardware: 0,
      Software: 0,
      Network: 0,
      Account: 0,
      Security: 0,
    };
    const matchedKeywords: string[] = [];

    (Object.keys(CATEGORY_KEYWORDS) as SupportCategory[]).forEach((cat) => {
      for (const entry of CATEGORY_KEYWORDS[cat]) {
        if (text.includes(entry.term)) {
          scores[cat] += entry.weight;
          if (!matchedKeywords.includes(entry.term)) {
            matchedKeywords.push(entry.term);
          }
        }
      }
    });

    let detectedCategory: SupportCategory = 'Software';
    let bestScore = -1;
    (Object.keys(scores) as SupportCategory[]).forEach((cat) => {
      if (scores[cat] > bestScore) {
        bestScore = scores[cat];
        detectedCategory = cat;
      }
    });

    if (bestScore <= 0) {
      detectedCategory = 'Software';
    }

    const confidence: 'high' | 'medium' | 'low' =
      bestScore >= 6 ? 'high' : bestScore >= 3 ? 'medium' : 'low';

    const combinedQuery = `${subject} ${description}`.trim();
    const suggestions = combinedQuery
      ? this.data.articles
          .filter((a) => a.status === 'published')
          .map((article) => ({
            article,
            score:
              this.scoreArticle(article, combinedQuery) +
              (article.category === detectedCategory ? 4 : 0),
          }))
          .filter((item) => item.score > 4)
          .sort((a, b) => b.score - a.score)
          .slice(0, 4)
          .map((item) => item.article)
      : [];

    return {
      detectedCategory,
      confidence,
      matchedKeywords: matchedKeywords.slice(0, 6),
      suggestions,
    };
  }

  public querySupportTickets(params: {
    q?: string;
    category?: string;
    status?: string;
    priority?: string;
  }) {
    const q = (params.q ?? '').trim().toLowerCase();
    const category = params.category && params.category !== 'All' ? params.category : null;
    const status = params.status && params.status !== 'All' ? params.status : null;
    const priority = params.priority && params.priority !== 'All' ? params.priority : null;

    const all = this.data.queries;
    const counts = {
      all: all.length,
      open: all.filter((item) => item.status === 'Open').length,
      inProgress: all.filter((item) => item.status === 'In Progress').length,
      resolved: all.filter((item) => item.status === 'Resolved').length,
    };

    const items = all
      .filter((item) => {
        if (category && item.category !== category) return false;
        if (status && item.status !== status) return false;
        if (priority && item.priority !== priority) return false;
        if (q) {
          const hay =
            `${item.ticketNumber} ${item.subject} ${item.description} ${item.requesterName} ${item.requesterEmail} ${item.category}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return { items, total: items.length, counts };
  }

  public createQuery(input: {
    requesterName: string;
    requesterEmail: string;
    subject: string;
    description: string;
    category?: SupportCategory;
    priority?: QueryPriority;
  }): SupportQuery {
    const analysis = this.suggestForQuery(input.subject, input.description);
    this.data.lastTicketSeq += 1;
    const nowIso = new Date().toISOString();

    const defaultAssignee: Record<SupportCategory, string> = {
      Hardware: 'Marcus Vance',
      Software: 'Priya Nair',
      Network: 'Tariq Al-Mansoor',
      Account: 'Hannah Lin',
      Security: 'Nadia Kowalski',
    };

    const chosenCategory = input.category ?? analysis.detectedCategory;

    const query: SupportQuery = {
      _id: `qry_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ticketNumber: `QRY-${this.data.lastTicketSeq}`,
      requesterName: input.requesterName.trim(),
      requesterEmail: input.requesterEmail.trim(),
      subject: input.subject.trim(),
      description: input.description.trim(),
      category: chosenCategory,
      autoDetectedCategory: analysis.detectedCategory,
      priority: input.priority ?? 'Medium',
      status: 'Open',
      matchedArticleIds: analysis.suggestions.map((s) => s._id),
      resolutionNote: '',
      assignedTo: defaultAssignee[chosenCategory],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.data.queries.unshift(query);
    this.persist();
    return query;
  }

  public updateQuery(
    id: string,
    patch: Partial<{
      category: SupportCategory;
      priority: QueryPriority;
      status: QueryStatus;
      resolutionNote: string;
      assignedTo: string;
      matchedArticleIds: string[];
    }>
  ): SupportQuery | null {
    const idx = this.data.queries.findIndex((q) => q._id === id);
    if (idx === -1) return null;

    const updated: SupportQuery = {
      ...this.data.queries[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.data.queries[idx] = updated;
    this.persist();
    return updated;
  }

  public deleteQuery(id: string): boolean {
    const before = this.data.queries.length;
    this.data.queries = this.data.queries.filter((q) => q._id !== id);
    if (this.data.queries.length === before) return false;
    this.persist();
    return true;
  }
}

export const db = new KnowledgeBaseStore();
