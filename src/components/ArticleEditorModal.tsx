import { Plus, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type {
  Article,
  ArticleStatus,
  ArticleType,
  SupportCategory,
} from '../types.ts';
import { ALL_CATEGORIES } from '../utils/format.ts';

interface ArticleEditorModalProps {
  open: boolean;
  editingArticle: Article | null;
  onClose: () => void;
  onSaved: (article: Article) => void;
}

export function ArticleEditorModal({
  open,
  editingArticle,
  onClose,
  onSaved,
}: ArticleEditorModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ArticleType>('guide');
  const [category, setCategory] = useState<SupportCategory>('Software');
  const [subcategory, setSubcategory] = useState('');
  const [status, setStatus] = useState<ArticleStatus>('published');
  const [author, setAuthor] = useState('Support Admin');
  const [summary, setSummary] = useState('');
  const [overview, setOverview] = useState('');
  const [steps, setSteps] = useState<string[]>(['']);
  const [errorCodesText, setErrorCodesText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (editingArticle) {
      setTitle(editingArticle.title);
      setType(editingArticle.type);
      setCategory(editingArticle.category);
      setSubcategory(editingArticle.subcategory);
      setStatus(editingArticle.status);
      setAuthor(editingArticle.author);
      setSummary(editingArticle.summary);
      setOverview(editingArticle.overview);
      setSteps(editingArticle.steps.length > 0 ? editingArticle.steps : ['']);
      setErrorCodesText(editingArticle.errorCodes.join(', '));
      setKeywordsText(editingArticle.keywords.join(', '));
    } else {
      setTitle('');
      setType('guide');
      setCategory('Software');
      setSubcategory('General');
      setStatus('published');
      setAuthor('Support Admin');
      setSummary('');
      setOverview('');
      setSteps(['', '']);
      setErrorCodesText('');
      setKeywordsText('');
    }
  }, [open, editingArticle]);

  if (!open) return null;

  const handleStepChange = (idx: number, val: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? val : s)));
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, '']);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const parsedSteps = steps.map((s) => s.trim()).filter(Boolean);
    const parsedErrorCodes = errorCodesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const parsedKeywords = keywordsText
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    try {
      const saved = editingArticle
        ? await api.updateArticle(editingArticle._id, {
            title,
            type,
            category,
            subcategory,
            status,
            author,
            summary,
            overview: overview || summary,
            steps: parsedSteps,
            errorCodes: parsedErrorCodes,
            keywords: parsedKeywords,
          })
        : await api.createArticle({
            title,
            type,
            category,
            subcategory,
            status,
            author,
            summary,
            overview: overview || summary,
            steps: parsedSteps,
            errorCodes: parsedErrorCodes,
            keywords: parsedKeywords,
          });
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save documentation resource.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingArticle ? 'Edit Knowledge Base Resource' : 'Create Knowledge Base Resource'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white rounded-xl border border-slate-200 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              {editingArticle
                ? `Edit ${editingArticle.code}`
                : 'Publish New FAQ or Troubleshooting Guide'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Changes persist directly to the knowledge base search index.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close editor"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="ed-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              Resource Title
            </label>
            <input
              id="ed-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Fix Thunderbolt 4 dock display dropping after sleep"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ed-type" className="block text-xs font-medium text-slate-700 mb-1.5">
                Resource Type
              </label>
              <select
                id="ed-type"
                value={type}
                onChange={(e) => setType(e.target.value as ArticleType)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="guide">Troubleshooting Guide</option>
                <option value="faq">FAQ</option>
              </select>
            </div>

            <div>
              <label htmlFor="ed-category" className="block text-xs font-medium text-slate-700 mb-1.5">
                Support Category
              </label>
              <select
                id="ed-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as SupportCategory)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              >
                {ALL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="ed-status" className="block text-xs font-medium text-slate-700 mb-1.5">
                Publication Status
              </label>
              <select
                id="ed-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ArticleStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ed-subcat" className="block text-xs font-medium text-slate-700 mb-1.5">
                Subcategory
              </label>
              <input
                id="ed-subcat"
                type="text"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                placeholder="e.g., Displays & Docks"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="ed-author" className="block text-xs font-medium text-slate-700 mb-1.5">
                Author
              </label>
              <input
                id="ed-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ed-summary" className="block text-xs font-medium text-slate-700 mb-1.5">
              Concise Summary
            </label>
            <textarea
              id="ed-summary"
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-sentence summary shown in search results."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          <div>
            <label htmlFor="ed-overview" className="block text-xs font-medium text-slate-700 mb-1.5">
              Root Cause & Technical Overview
            </label>
            <textarea
              id="ed-overview"
              rows={3}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="Detailed context explaining why this issue occurs or policy rules."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Dynamic Steps Builder */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Resolution Steps / Key Points
              </label>
              <button
                type="button"
                onClick={handleAddStep}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-400 w-6 text-right tabular-nums shrink-0">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => handleStepChange(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}...`}
                    className="flex-1 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(idx)}
                    aria-label={`Remove step ${idx + 1}`}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ed-errors" className="block text-xs font-medium text-slate-700 mb-1.5">
                Error Codes (comma-separated)
              </label>
              <input
                id="ed-errors"
                type="text"
                value={errorCodesText}
                onChange={(e) => setErrorCodesText(e.target.value)}
                placeholder="e.g., 0xc000007b, ERR_TIMEOUT"
                className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label htmlFor="ed-keywords" className="block text-xs font-medium text-slate-700 mb-1.5">
                Search Keywords (comma-separated)
              </label>
              <input
                id="ed-keywords"
                type="text"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                placeholder="e.g., vpn, dns, split-tunnel"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {saving
                ? 'Saving...'
                : editingArticle
                ? 'Save Changes'
                : 'Publish Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
