import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { db } from './server/db.ts';
import type {
  ArticleStatus,
  ArticleType,
  QueryPriority,
  QueryStatus,
  SupportCategory,
} from './src/types.ts';

dotenv.config();

const VALID_CATEGORIES = new Set<SupportCategory>([
  'Hardware',
  'Software',
  'Network',
  'Account',
  'Security',
]);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT ?? 3000);

  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // -------------------------------------------------------------------------
  // Knowledge Base Articles (FAQs & Troubleshooting Guides)
  // -------------------------------------------------------------------------
  app.get('/api/articles', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const type = typeof req.query.type === 'string' ? req.query.type : 'all';
    const status = typeof req.query.status === 'string' ? req.query.status : 'published';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
    const limit = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const offset = typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

    const result = db.queryArticles({
      q,
      category,
      type,
      status,
      sort,
      limit: Number.isFinite(limit) ? limit : undefined,
      offset: Number.isFinite(offset) ? offset : 0,
    });
    res.json(result);
  });

  app.get('/api/articles/:id', (req, res) => {
    const trackView = req.query.view === '1';
    const article = db.getArticleById(req.params.id, trackView);
    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(article);
  });

  app.post('/api/articles', (req, res) => {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
    const category = body.category as SupportCategory;
    const type: ArticleType = body.type === 'guide' ? 'guide' : 'faq';

    if (!title || !summary || !VALID_CATEGORIES.has(category)) {
      res.status(400).json({
        error: 'Title, summary, and a valid support category are required.',
      });
      return;
    }

    const steps = Array.isArray(body.steps)
      ? body.steps.filter((s: unknown): s is string => typeof s === 'string')
      : [];
    const errorCodes = Array.isArray(body.errorCodes)
      ? body.errorCodes.filter((s: unknown): s is string => typeof s === 'string')
      : [];
    const keywords = Array.isArray(body.keywords)
      ? body.keywords.filter((s: unknown): s is string => typeof s === 'string')
      : [];

    const created = db.createArticle({
      title,
      type,
      category,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : 'General',
      summary,
      overview: typeof body.overview === 'string' ? body.overview : summary,
      steps,
      errorCodes,
      keywords,
      status: (['published', 'draft', 'archived'].includes(body.status)
        ? body.status
        : 'published') as ArticleStatus,
      author: typeof body.author === 'string' ? body.author : 'Support Admin',
    });

    res.status(201).json(created);
  });

  app.put('/api/articles/:id', (req, res) => {
    const body = req.body ?? {};
    if (body.category !== undefined && !VALID_CATEGORIES.has(body.category)) {
      res.status(400).json({ error: 'Invalid category' });
      return;
    }

    const updated = db.updateArticle(req.params.id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      type: body.type === 'faq' || body.type === 'guide' ? body.type : undefined,
      category: body.category as SupportCategory | undefined,
      subcategory: typeof body.subcategory === 'string' ? body.subcategory : undefined,
      summary: typeof body.summary === 'string' ? body.summary : undefined,
      overview: typeof body.overview === 'string' ? body.overview : undefined,
      steps: Array.isArray(body.steps) ? body.steps : undefined,
      errorCodes: Array.isArray(body.errorCodes) ? body.errorCodes : undefined,
      keywords: Array.isArray(body.keywords) ? body.keywords : undefined,
      status: ['published', 'draft', 'archived'].includes(body.status)
        ? (body.status as ArticleStatus)
        : undefined,
      author: typeof body.author === 'string' ? body.author : undefined,
    });

    if (!updated) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/articles/:id', (req, res) => {
    const deleted = db.deleteArticle(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json({ deleted: true });
  });

  app.post('/api/articles/:id/feedback', (req, res) => {
    const helpful = Boolean(req.body?.helpful);
    const updated = db.recordFeedback(req.params.id, helpful);
    if (!updated) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }
    res.json(updated);
  });

  // -------------------------------------------------------------------------
  // Categories Summary
  // -------------------------------------------------------------------------
  app.get('/api/categories', (_req, res) => {
    res.json(db.getCategoriesSummary());
  });

  // -------------------------------------------------------------------------
  // Customer Queries & Auto-Categorization
  // -------------------------------------------------------------------------
  app.post('/api/queries/suggest', (req, res) => {
    const subject = typeof req.body?.subject === 'string' ? req.body.subject : '';
    const description =
      typeof req.body?.description === 'string' ? req.body.description : '';
    res.json(db.suggestForQuery(subject, description));
  });

  app.get('/api/queries', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const category = typeof req.query.category === 'string' ? req.query.category : 'All';
    const status = typeof req.query.status === 'string' ? req.query.status : 'All';
    const priority = typeof req.query.priority === 'string' ? req.query.priority : 'All';
    res.json(db.querySupportTickets({ q, category, status, priority }));
  });

  app.post('/api/queries', (req, res) => {
    const body = req.body ?? {};
    const requesterName =
      typeof body.requesterName === 'string' ? body.requesterName.trim() : '';
    const requesterEmail =
      typeof body.requesterEmail === 'string' ? body.requesterEmail.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';

    if (!requesterName || !requesterEmail || !subject || !description) {
      res.status(400).json({
        error: 'Name, email, subject, and issue description are required.',
      });
      return;
    }

    const category = VALID_CATEGORIES.has(body.category)
      ? (body.category as SupportCategory)
      : undefined;
    const priority: QueryPriority = ['Low', 'Medium', 'High', 'Urgent'].includes(
      body.priority
    )
      ? body.priority
      : 'Medium';

    const created = db.createQuery({
      requesterName,
      requesterEmail,
      subject,
      description,
      category,
      priority,
    });
    res.status(201).json(created);
  });

  app.patch('/api/queries/:id', (req, res) => {
    const body = req.body ?? {};
    const updated = db.updateQuery(req.params.id, {
      category: VALID_CATEGORIES.has(body.category)
        ? (body.category as SupportCategory)
        : undefined,
      priority: ['Low', 'Medium', 'High', 'Urgent'].includes(body.priority)
        ? (body.priority as QueryPriority)
        : undefined,
      status: ['Open', 'In Progress', 'Resolved'].includes(body.status)
        ? (body.status as QueryStatus)
        : undefined,
      resolutionNote:
        typeof body.resolutionNote === 'string' ? body.resolutionNote : undefined,
      assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : undefined,
      matchedArticleIds: Array.isArray(body.matchedArticleIds)
        ? body.matchedArticleIds
        : undefined,
    });

    if (!updated) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/queries/:id', (req, res) => {
    const deleted = db.deleteQuery(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Query not found' });
      return;
    }
    res.json({ deleted: true });
  });

  // -------------------------------------------------------------------------
  // Vite Dev Middleware or Production Static Serving
  // -------------------------------------------------------------------------
  const distDir = path.resolve(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distDir);

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`ResolveBase server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
