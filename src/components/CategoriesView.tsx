import { ArrowRight, Cpu, Globe, KeyRound, ShieldCheck, Terminal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type { Article, CategorySummary, SupportCategory } from '../types.ts';

interface CategoriesViewProps {
  categories: CategorySummary[];
  onDrillDownCategory: (category: SupportCategory) => void;
  onSelectArticle: (articleId: string) => void;
}

const CATEGORY_ICONS: Record<SupportCategory, typeof Cpu> = {
  Hardware: Cpu,
  Software: Terminal,
  Network: Globe,
  Account: KeyRound,
  Security: ShieldCheck,
};

export function CategoriesView({
  categories,
  onDrillDownCategory,
  onSelectArticle,
}: CategoriesViewProps) {
  const [samplesByCategory, setSamplesByCategory] = useState<
    Partial<Record<SupportCategory, Article[]>>
  >({});

  useEffect(() => {
    Promise.all(
      categories.map(async (cat) => {
        const res = await api.getArticles({
          category: cat.category,
          status: 'published',
          sort: 'views',
          limit: 4,
        });
        return [cat.category, res.items] as const;
      })
    )
      .then((entries) => {
        const map: Partial<Record<SupportCategory, Article[]>> = {};
        for (const [cat, items] of entries) {
          map[cat] = items;
        }
        setSamplesByCategory(map);
      })
      .catch(() => {
        // ignore
      });
  }, [categories]);

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-10 space-y-8 pb-16">
      <div className="space-y-2 border-b border-slate-200 pb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
          Support Categories & Resource Taxonomy
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl">
          Structured documentation across five operational domains. Select any category to filter the full knowledge base or jump straight into top troubleshooting guides.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.category];
          const samples = samplesByCategory[cat.category] ?? [];

          return (
            <section
              key={cat.category}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-slate-900">
                        {cat.category}
                      </h2>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {cat.publishedArticles} published · {cat.faqCount} FAQs · {cat.guideCount} guides · {cat.openQueries} open queries
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDrillDownCategory(cat.category)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap shrink-0"
                  >
                    <span>Browse all</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {cat.description}
                </p>

                <div className="text-xs text-slate-500">
                  Subcategories:{' '}
                  <span className="text-slate-700">
                    {cat.subcategories.join(' · ')}
                  </span>
                </div>

                {samples.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-xs font-medium text-slate-500">
                      Top guides & FAQs
                    </div>
                    <div className="divide-y divide-slate-100">
                      {samples.map((art) => (
                        <button
                          key={art._id}
                          type="button"
                          onClick={() => onSelectArticle(art._id)}
                          className="w-full text-left py-2 hover:text-blue-600 transition-colors flex items-center justify-between gap-3 group"
                        >
                          <span className="text-sm text-slate-800 group-hover:text-blue-600 truncate">
                            {art.title}
                          </span>
                          <span className="font-mono text-xs text-slate-400 shrink-0">
                            {art.code}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
