import {
  Archive,
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type {
  Article,
  ArticleStatus,
  CategorySummary,
  SupportCategory,
} from '../types.ts';
import { ALL_CATEGORIES, formatShortDate } from '../utils/format.ts';
import { ArticleEditorModal } from './ArticleEditorModal.tsx';

interface AdminConsoleViewProps {
  categories: CategorySummary[];
  onSelectArticle: (articleId: string) => void;
  onResourcesChanged: () => void;
  refreshSignal: number;
}

function ResourceStatusText({ status }: { status: ArticleStatus }) {
  if (status === 'published') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Published</span>
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <FileText className="w-3.5 h-3.5 shrink-0" />
        <span>Draft</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
      <Archive className="w-3.5 h-3.5 shrink-0" />
      <span>Archived</span>
    </span>
  );
}

export function AdminConsoleView({
  categories,
  onSelectArticle,
  onResourcesChanged,
  refreshSignal,
}: AdminConsoleViewProps) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    published: 0,
    draft: 0,
    archived: 0,
    faq: 0,
    guide: 0,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | 'All'>('All');
  const [typeFilter, setTypeFilter] = useState<'all' | 'faq' | 'guide'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getArticles({
        q: search,
        category: categoryFilter,
        type: typeFilter,
        status: statusFilter,
        sort: 'recent',
        limit: 250,
      })
      .then((res) => {
        if (cancelled) return;
        setArticles(res.items);
        setCounts(res.counts);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, typeFilter, statusFilter, refreshSignal]);

  const totalOpenQueries = categories.reduce((sum, c) => sum + c.openQueries, 0);

  const handleToggleStatus = async (article: Article) => {
    const nextStatus: ArticleStatus =
      article.status === 'published' ? 'archived' : 'published';
    const updated = await api.updateArticle(article._id, { status: nextStatus });
    setArticles((prev) => prev.map((a) => (a._id === updated._id ? updated : a)));
    onResourcesChanged();
  };

  const handleDelete = async (id: string) => {
    await api.deleteArticle(id);
    setConfirmDeleteId(null);
    setArticles((prev) => prev.filter((a) => a._id !== id));
    onResourcesChanged();
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8 pb-16">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Documentation & Resource Admin Console
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Create, edit, archive, and audit technical FAQs and troubleshooting guides across all support categories.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingArticle(null);
            setEditorOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Resource</span>
        </button>
      </div>

      {/* Real Computed KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Total Knowledge Resources</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {counts.all}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {counts.faq} FAQs · {counts.guide} Guides
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Published on Portal</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {counts.published}
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {counts.draft} drafts · {counts.archived} archived
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Support Categories</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {categories.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Hardware, Software, Network, Account, Security
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">Active Unresolved Queries</div>
          <div className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalOpenQueries}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Open & In-Progress tickets
          </div>
        </div>
      </section>

      {/* Category Coverage Table */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-slate-900">
            Category Coverage Breakdown
          </h2>
          <span className="text-xs text-slate-500">Live collection counts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-2.5 px-5">Category</th>
                <th className="py-2.5 px-4 text-right">Published Docs</th>
                <th className="py-2.5 px-4 text-right">FAQs</th>
                <th className="py-2.5 px-4 text-right">Guides</th>
                <th className="py-2.5 px-4 text-right">Total Views</th>
                <th className="py-2.5 px-5 text-right">Open Queries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat) => (
                <tr key={cat.category} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-5 font-medium text-slate-900">{cat.category}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-700">
                    {cat.publishedArticles}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600">
                    {cat.faqCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600">
                    {cat.guideCount}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600">
                    {cat.totalViews.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-5 text-right font-mono text-xs tabular-nums text-slate-700">
                    {cat.openQueries}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Documentation Resource Manager */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('All')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                categoryFilter === 'All'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter by type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'faq' | 'guide')}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="faq">FAQs</option>
              <option value="guide">Troubleshooting Guides</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | ArticleStatus)}
              className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search KB code or title..."
                aria-label="Search documentation resources"
                className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4 whitespace-nowrap">Code</th>
                  <th className="py-3 px-4">Title & Subcategory</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4 whitespace-nowrap">Type</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Views</th>
                  <th className="py-3 px-4 whitespace-nowrap">Updated</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} className="py-3.5 px-4">
                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                      </td>
                    </tr>
                  ))
                ) : articles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-6 text-center text-sm text-slate-500">
                      No documentation resources match your filters.
                    </td>
                  </tr>
                ) : (
                  articles.map((article) => (
                    <tr key={article._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 whitespace-nowrap">
                        {article.code}
                      </td>
                      <td className="py-3 px-4 min-w-[260px]">
                        <div className="font-medium text-slate-900 line-clamp-1">
                          {article.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {article.subcategory} · {article.author}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {article.category}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {article.type === 'guide' ? 'Guide' : 'FAQ'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <ResourceStatusText status={article.status} />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                        {article.views.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatShortDate(article.updatedAt)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onSelectArticle(article._id)}
                            title="Preview article"
                            aria-label={`Preview ${article.code}`}
                            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArticle(article);
                              setEditorOpen(true);
                            }}
                            title="Edit resource"
                            aria-label={`Edit ${article.code}`}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-blue-50"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(article)}
                            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md hover:bg-slate-50"
                          >
                            {article.status === 'published' ? 'Archive' : 'Publish'}
                          </button>
                          {confirmDeleteId === article._id ? (
                            <button
                              type="button"
                              onClick={() => handleDelete(article._id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
                            >
                              Confirm
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(article._id)}
                              title="Delete resource"
                              aria-label={`Delete ${article.code}`}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ArticleEditorModal
        open={editorOpen}
        editingArticle={editingArticle}
        onClose={() => setEditorOpen(false)}
        onSaved={() => onResourcesChanged()}
      />
    </div>
  );
}
