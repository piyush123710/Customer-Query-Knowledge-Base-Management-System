import {
  Check,
  CheckSquare,
  Copy,
  Square,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type { Article } from '../types.ts';
import { formatShortDate, helpfulPercentage } from '../utils/format.ts';

interface ArticleReaderDrawerProps {
  articleId: string | null;
  onClose: () => void;
  onSelectArticle: (id: string) => void;
  onOpenSubmitQueryWithTopic: (topic: string) => void;
  onArticleUpdated?: (article: Article) => void;
}

export function ArticleReaderDrawer({
  articleId,
  onClose,
  onSelectArticle,
  onOpenSubmitQueryWithTopic,
  onArticleUpdated,
}: ArticleReaderDrawerProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const [copiedSteps, setCopiedSteps] = useState(false);

  useEffect(() => {
    if (!articleId) {
      setArticle(null);
      setRelated([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCheckedSteps({});
    setVoted(null);
    setCopiedSteps(false);

    api
      .getArticle(articleId, true)
      .then(async (loaded) => {
        if (cancelled) return;
        setArticle(loaded);
        onArticleUpdated?.(loaded);
        const relRes = await api.getArticles({
          category: loaded.category,
          status: 'published',
          limit: 5,
        });
        if (!cancelled) {
          setRelated(relRes.items.filter((a) => a._id !== loaded._id).slice(0, 3));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load article');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [articleId]);

  useEffect(() => {
    if (!articleId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [articleId, onClose]);

  if (!articleId) return null;

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleVote = async (helpful: boolean) => {
    if (!article || voted) return;
    try {
      const updated = await api.sendFeedback(article._id, helpful);
      setArticle(updated);
      setVoted(helpful ? 'up' : 'down');
      onArticleUpdated?.(updated);
    } catch {
      // ignore transient vote failure
    }
  };

  const handleCopySteps = async () => {
    if (!article) return;
    const text = [
      `${article.code} — ${article.title}`,
      '',
      article.overview,
      '',
      ...article.steps.map((step, i) => `${i + 1}. ${step}`),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSteps(true);
      setTimeout(() => setCopiedSteps(false), 2000);
    } catch {
      // clipboard permission fallback ignored
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={article?.title ?? 'Knowledge Base Article'}
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white h-full overflow-y-auto border-l border-slate-200 shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Drawer Bar */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {article ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums truncate">
                <span className="font-medium text-slate-700">{article.code}</span>
                <span aria-hidden="true">/</span>
                <span>{article.category}</span>
                <span aria-hidden="true">/</span>
                <span>{article.subcategory}</span>
              </div>
            ) : (
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {article && (
              <button
                type="button"
                onClick={handleCopySteps}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                {copiedSteps ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Guide</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close article reader"
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 px-6 sm:px-8 py-7 space-y-8">
          {loading && (
            <div className="space-y-4">
              <div className="h-7 w-4/5 bg-slate-100 rounded animate-pulse" />
              <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
              <div className="h-28 w-full bg-slate-50 rounded-lg border border-slate-200 animate-pulse" />
              <div className="space-y-3 pt-4">
                <div className="h-12 bg-slate-50 rounded-lg animate-pulse" />
                <div className="h-12 bg-slate-50 rounded-lg animate-pulse" />
                <div className="h-12 bg-slate-50 rounded-lg animate-pulse" />
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-5 rounded-xl border border-red-200 bg-red-50/50 text-sm text-red-700">
              {error}
            </div>
          )}

          {article && !loading && (
            <>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {article.type === 'guide' ? 'Troubleshooting Guide' : 'Frequently Asked Question'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>Updated {formatShortDate(article.updatedAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{article.views.toLocaleString()} views</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {helpfulPercentage(article.helpfulCount, article.notHelpfulCount)}% helpful
                  </span>
                </div>

                <h2 className="font-display text-2xl font-bold text-slate-900 leading-snug text-balance">
                  {article.title}
                </h2>

                <p className="text-base text-slate-600 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              {/* Technical Context / Overview */}
              <section className="pt-5 border-t border-slate-200 space-y-2.5">
                <h3 className="font-display text-sm font-semibold text-slate-900">
                  Root Cause & Technical Overview
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {article.overview}
                </p>
                {article.errorCodes.length > 0 && (
                  <p className="text-xs text-slate-500 pt-1">
                    Associated error codes:{' '}
                    <span className="font-mono text-slate-800">
                      {article.errorCodes.join(', ')}
                    </span>
                  </p>
                )}
              </section>

              {/* Step-by-Step Resolution Checklist */}
              <section className="pt-5 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    {article.type === 'guide'
                      ? 'Resolution Checklist'
                      : 'Key Details & Action Items'}
                  </h3>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {Object.values(checkedSteps).filter(Boolean).length} / {article.steps.length} checked
                  </span>
                </div>

                <ol className="space-y-2.5">
                  {article.steps.map((step, idx) => {
                    const checked = Boolean(checkedSteps[idx]);
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          onClick={() => toggleStep(idx)}
                          className={`w-full text-left flex items-start gap-3 p-3.5 rounded-lg border transition-colors ${
                            checked
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-800'
                          }`}
                        >
                          <span className="mt-0.5 shrink-0 text-slate-400">
                            {checked ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </span>
                          <span className="text-sm leading-relaxed">
                            <span className="font-mono text-xs font-medium text-slate-400 mr-2 tabular-nums">
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <span className={checked ? 'line-through' : ''}>{step}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>

              {/* Keywords & Author metadata */}
              <section className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                <div>
                  Author: <span className="text-slate-700 font-medium">{article.author}</span>
                </div>
                {article.keywords.length > 0 && (
                  <div className="truncate max-w-full">
                    Topics: {article.keywords.slice(0, 5).join(' · ')}
                  </div>
                )}
              </section>

              {/* Helpfulness Feedback */}
              <section className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Did this resource resolve your issue?
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {article.helpfulCount} users found this helpful
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={voted !== null}
                    onClick={() => handleVote(true)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      voted === 'up'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                    }`}
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Yes, helpful</span>
                  </button>
                  <button
                    type="button"
                    disabled={voted !== null}
                    onClick={() => handleVote(false)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                      voted === 'down'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60'
                    }`}
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                    <span>Needs detail</span>
                  </button>
                </div>
              </section>

              {/* Escalation Link */}
              <div className="flex items-center justify-between gap-4 pt-2 text-xs text-slate-500">
                <span>Still encountering the problem after completing these steps?</span>
                <button
                  type="button"
                  onClick={() => {
                    const title = article.title;
                    onClose();
                    onOpenSubmitQueryWithTopic(`Follow-up on ${article.code}: ${title}`);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline whitespace-nowrap shrink-0"
                >
                  Open a support query
                </button>
              </div>

              {/* Related Articles */}
              {related.length > 0 && (
                <section className="pt-6 border-t border-slate-200 space-y-3">
                  <h3 className="font-display text-sm font-semibold text-slate-900">
                    Related in {article.category}
                  </h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
                    {related.map((item) => (
                      <button
                        key={item._id}
                        type="button"
                        onClick={() => onSelectArticle(item._id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                            {item.code} · {item.type === 'guide' ? 'Guide' : 'FAQ'} · {item.views.toLocaleString()} views
                          </div>
                        </div>
                        <span className="text-xs font-medium text-blue-600 shrink-0">
                          Read
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
