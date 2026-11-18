import { useCallback, useEffect, useState } from 'react';
import { api } from './api.ts';
import { AdminConsoleView } from './components/AdminConsoleView.tsx';
import { ArticleReaderDrawer } from './components/ArticleReaderDrawer.tsx';
import { CategoriesView } from './components/CategoriesView.tsx';
import { KnowledgeBaseView } from './components/KnowledgeBaseView.tsx';
import { QueryQueueView } from './components/QueryQueueView.tsx';
import { SubmitQueryModal } from './components/SubmitQueryModal.tsx';
import { type ActiveTab, TopBar } from './components/TopBar.tsx';
import type { CategorySummary, SupportCategory } from './types.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('portal');
  const [selectedPortalCategory, setSelectedPortalCategory] = useState<
    SupportCategory | 'All'
  >('All');
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [activeArticleId, setActiveArticleId] = useState<string | null>(null);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitTopic, setSubmitTopic] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshSignal((s) => s + 1);
  }, []);

  useEffect(() => {
    api
      .getCategories()
      .then((res) => setCategories(res))
      .catch(() => {
        // ignore transient startup fetch error
      });
  }, [refreshSignal]);

  const handleOpenSubmitQuery = (topic = '') => {
    setSubmitTopic(topic);
    setSubmitModalOpen(true);
  };

  const handleDrillDownCategory = (category: SupportCategory) => {
    setSelectedPortalCategory(category);
    setActiveTab('portal');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'portal') {
            setSelectedPortalCategory('All');
          }
        }}
        onOpenSubmitQuery={() => handleOpenSubmitQuery('')}
      />

      <main className="flex-1">
        {activeTab === 'portal' && (
          <KnowledgeBaseView
            categories={categories}
            initialCategory={selectedPortalCategory}
            onSelectArticle={(id) => setActiveArticleId(id)}
            onOpenSubmitQuery={(topic) => handleOpenSubmitQuery(topic)}
            refreshSignal={refreshSignal}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesView
            categories={categories}
            onDrillDownCategory={handleDrillDownCategory}
            onSelectArticle={(id) => setActiveArticleId(id)}
          />
        )}

        {activeTab === 'queries' && (
          <QueryQueueView
            onOpenSubmitQuery={() => handleOpenSubmitQuery('')}
            onSelectArticle={(id) => setActiveArticleId(id)}
            onQueriesChanged={triggerRefresh}
            refreshSignal={refreshSignal}
          />
        )}

        {activeTab === 'admin' && (
          <AdminConsoleView
            categories={categories}
            onSelectArticle={(id) => setActiveArticleId(id)}
            onResourcesChanged={triggerRefresh}
            refreshSignal={refreshSignal}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>ResolveBase · Customer Query & Knowledge Base Management System</div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('portal')}
              className="hover:text-slate-900 transition-colors"
            >
              Knowledge Base
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('queries')}
              className="hover:text-slate-900 transition-colors"
            >
              Query Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className="hover:text-slate-900 transition-colors"
            >
              Admin Console
            </button>
          </div>
        </div>
      </footer>

      <ArticleReaderDrawer
        articleId={activeArticleId}
        onClose={() => setActiveArticleId(null)}
        onSelectArticle={(id) => setActiveArticleId(id)}
        onOpenSubmitQueryWithTopic={(topic) => handleOpenSubmitQuery(topic)}
        onArticleUpdated={() => triggerRefresh()}
      />

      <SubmitQueryModal
        open={submitModalOpen}
        initialSubject={submitTopic}
        onClose={() => setSubmitModalOpen(false)}
        onSubmitted={() => triggerRefresh()}
        onSelectArticle={(id) => {
          setSubmitModalOpen(false);
          setActiveArticleId(id);
        }}
        onViewQueue={() => setActiveTab('queries')}
      />
    </div>
  );
}
