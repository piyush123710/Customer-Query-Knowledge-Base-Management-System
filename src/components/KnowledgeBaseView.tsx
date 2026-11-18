import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  Globe,
  KeyRound,
  Search,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../api.ts';
import type {
  Article,
  CategorySummary,
  SupportCategory,
} from '../types.ts';
import {
  ALL_CATEGORIES,
  formatShortDate,
  helpfulPercentage,
} from '../utils/format.ts';

interface KnowledgeBaseViewProps {
  categories: CategorySummary[];
  initialCategory?: SupportCategory | 'All';
  onSelectArticle: (articleId: string) => void;
  onOpenSubmitQuery: (topic?: string) => void;
  refreshSignal: number;
}

const PAGE_SIZE = 18;

const CATEGORY_ICONS: Record<SupportCategory, typeof Cpu> = {
  Hardware: Cpu,
  Software: Terminal,
  Network: Globe,
  Account: KeyRound,
  Security: ShieldCheck,
};

export function KnowledgeBaseView({
  categories,
  initialCategory = 'All',
  onSelectArticle,
  onOpenSubmitQuery,
  refreshSignal,
}: KnowledgeBaseViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SupportCategory | 'All'>(
    initialCategory
  );
  const [selectedType, setSelectedType] = useState<'all' | 'faq' | 'guide'>('all');
  const [sortBy, setSortBy] = useState<'relevance' | 'views' | 'helpful' | 'recent'>('views');
  const [page, setPage] = useState(1);

  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [publishedTotal, setPublishedTotal] = useState(110);
  const [topIssues, setTopIssues] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setPage(1);
  }, [initialCategory]);

  // '/' keyboard shortcut to focus search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(1);
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch frequently reported issues once / on refresh
  useEffect(() => {
    api
      .getArticles({ status: 'published', sort: 'views', limit: 6 })
      .then((res) => {
        setTopIssues(res.items);
        setPublishedTotal(res.counts.published);
      })
      .catch(() => {
        // handled by main fetch
      });
  }, [refreshSignal]);

  // Fetch filtered & paginated directory
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const activeSort = debouncedQuery && sortBy === 'views' ? 'relevance' : sortBy;

    api
      .getArticles({
        q: debouncedQuery,
        category: selectedCategory,
        type: selectedType,
        status: 'published',
        sort: activeSort,
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setArticles(res.items);
        setTotal(res.total);
        setPublishedTotal(res.counts.published);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load knowledge base.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selectedCategory, selectedType, sortBy, page, refreshSignal]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isDefaultOverview =
    !debouncedQuery && selectedCategory === 'All' && selectedType === 'all' && page === 1;

  const quickSearchTerms = [
    '0xc000007b',
    'VPN DNS',
    '4K flickering',
    'BitLocker',
    'SAML SSO',
    'Wi-Fi 6E',
  ];

  return (
    <div className="space-y-10 pb-16">
      {/* Search & Filter Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-12 space-y-6">
          <div className="max-w-3xl space-y-2.5">
            <p className="text-xs font-medium text-slate-500 tabular-nums">
              Technical Support Portal · {publishedTotal} published FAQs and troubleshooting guides
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
              Search documentation, error codes, and troubleshooting guides
            </h1>
          </div>

          {/* Search Input Row */}
          <div className="max-w-3xl space-y-3">
            <div className="relative flex items-center">
              <Search
                aria-hidden="true"
                className="w-5 h-5 text-slate-400 absolute left-4 pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by symptom, error code (e.g. 0xc000007b, AADSTS50105), or topic..."
                aria-label="Search knowledge base"
                className="w-full pl-12 pr-20 py-3.5 text-sm sm:text-base bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex absolute right-3.5 px-2 py-0.5 text-xs font-mono text-slate-400 border border-slate-200 rounded">
                  /
                </kbd>
              )}
            </div>

            {/* Common search shortcuts */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
              <span>Common lookups:</span>
              {quickSearchTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setSearchQuery(term)}
                  className="text-slate-700 hover:text-blue-600 hover:underline font-medium transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Strip + Type Segmented Control */}
          <div className="pt-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-slate-100">
            <div
              role="tablist"
              aria-label="Filter by support category"
              className="flex flex-wrap items-center gap-1.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedCategory === 'All'}
                onClick={() => {
                  setSelectedCategory('All');
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === 'All'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                All Categories
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const count =
                  categories.find((c) => c.category === cat)?.publishedArticles ?? 0;
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => {
                      setSelectedCategory(cat);
                      setPage(1);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                      active
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Type Segmented Control */}
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'All Types' },
                    { id: 'faq', label: 'FAQs' },
                    { id: 'guide', label: 'Guides' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(item.id);
                      setPage(1);
                    }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      selectedType === item.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <select
                aria-label="Sort results"
                value={sortBy}
                onChange={(e) =>
                  setSortBy(
                    e.target.value as 'relevance' | 'views' | 'helpful' | 'recent'
                  )
                }
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="views">Most Viewed</option>
                <option value="helpful">Most Helpful</option>
                <option value="recent">Recently Updated</option>
                {debouncedQuery && <option value="relevance">Best Match</option>}
              </select>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
        {/* Category Quick Cards + Frequently Reported Issues (shown in default browsing state) */}
        {isDefaultOverview && (
          <>
            <section className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Browse by Support Category
                </h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {categories.length} core technical domains
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {categories.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.category];
                  return (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.category);
                        setPage(1);
                      }}
                      className="text-left p-5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors flex flex-col justify-between gap-4 group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <Icon
                            aria-hidden="true"
                            className="w-5 h-5 text-slate-700 group-hover:text-blue-600 transition-colors"
                          />
                          <span className="font-mono text-xs text-slate-500 tabular-nums">
                            {cat.publishedArticles} docs
                          </span>
                        </div>
                        <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {cat.category}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {cat.description}
                        </p>
                      </div>
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
                        {cat.faqCount} FAQs · {cat.guideCount} Guides
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Frequently Reported Issues
                </h2>
                <span className="text-xs text-slate-500">
                  Highest-volume troubleshooting guides
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topIssues.map((article) => (
                  <button
                    key={article._id}
                    type="button"
                    onClick={() => onSelectArticle(article._id)}
                    className="text-left p-5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-colors flex flex-col justify-between gap-4 group"
                  >
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 font-mono tabular-nums">
                        {article.code} · {article.category} ·{' '}
                        {article.type === 'guide' ? 'Guide' : 'FAQ'}
                      </div>
                      <h3 className="font-display text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {article.title}
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {article.summary}
                      </p>
                    </div>
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 tabular-nums">
                      {article.views.toLocaleString()} views ·{' '}
                      {helpfulPercentage(article.helpfulCount, article.notHelpfulCount)}% helpful
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {/* Complete Searchable Knowledge Base Directory */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-900">
                {debouncedQuery
                  ? `Search Results for "${debouncedQuery}"`
                  : selectedCategory === 'All'
                  ? 'All Knowledge Base Resources'
                  : `${selectedCategory} Documentation`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                Showing {articles.length} of {total} matching resources
                {selectedType !== 'all' ? ` (${selectedType === 'faq' ? 'FAQs' : 'Guides'})` : ''}
              </p>
            </div>

            {(debouncedQuery || selectedCategory !== 'All' || selectedType !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setDebouncedQuery('');
                  setSelectedCategory('All');
                  setSelectedType('all');
                  setPage(1);
                }}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Reset all filters
              </button>
            )}
          </div>

          {error && (
            <div className="p-5 bg-white border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="px-5 py-4 space-y-2">
                  <div className="h-3.5 w-44 bg-slate-100 rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3.5 w-1/2 bg-slate-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <div className="p-10 bg-white border border-slate-200 rounded-xl text-center space-y-3">
              <h3 className="font-display text-base font-semibold text-slate-900">
                No matching FAQs or troubleshooting guides found
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Try broader search terms or submit a support query so an engineer can investigate and document the solution.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onOpenSubmitQuery(debouncedQuery)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Submit Query for "{debouncedQuery || selectedCategory}"
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {articles.map((article) => (
                <button
                  key={article._id}
                  type="button"
                  onClick={() => onSelectArticle(article._id)}
                  className="w-full text-left px-5 py-4 hover:bg-slate-50/90 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 tabular-nums">
                      <span className="font-mono font-medium text-slate-700">
                        {article.code}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{article.category}</span>
                      <span aria-hidden="true">/</span>
                      <span>{article.subcategory}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {article.type === 'guide' ? 'Troubleshooting Guide' : 'FAQ'}
                      </span>
                      {article.errorCodes.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-600">
                            {article.errorCodes[0]}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-slate-600 line-clamp-1">
                      {article.summary}
                    </p>
                  </div>

                  <div className="flex sm:flex-col sm:items-end justify-between gap-1 shrink-0 text-xs text-slate-500 tabular-nums">
                    <span>{article.views.toLocaleString()} views</span>
                    <span>
                      {helpfulPercentage(article.helpfulCount, article.notHelpfulCount)}% helpful ·{' '}
                      {formatShortDate(article.updatedAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500 tabular-nums">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-45"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-45"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
