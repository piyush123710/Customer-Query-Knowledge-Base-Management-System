import { ArrowRight, CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type {
  QueryPriority,
  SuggestResponse,
  SupportCategory,
  SupportQuery,
} from '../types.ts';
import { ALL_CATEGORIES } from '../utils/format.ts';

interface SubmitQueryModalProps {
  open: boolean;
  initialSubject?: string;
  onClose: () => void;
  onSubmitted: (query: SupportQuery) => void;
  onSelectArticle: (articleId: string) => void;
  onViewQueue: () => void;
}

export function SubmitQueryModal({
  open,
  initialSubject = '',
  onClose,
  onSubmitted,
  onSelectArticle,
  onViewQueue,
}: SubmitQueryModalProps) {
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [subject, setSubject] = useState(initialSubject);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SupportCategory>('Software');
  const [manualCategoryOverride, setManualCategoryOverride] = useState(false);
  const [priority, setPriority] = useState<QueryPriority>('Medium');
  const [analysis, setAnalysis] = useState<SuggestResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<SupportQuery | null>(null);

  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setCreatedTicket(null);
      setError(null);
      setManualCategoryOverride(false);
    }
  }, [open, initialSubject]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trimmed = `${subject} ${description}`.trim();
    if (trimmed.length < 4) {
      setAnalysis(null);
      return;
    }

    const timer = setTimeout(() => {
      api
        .suggestQuerySolutions(subject, description)
        .then((res) => {
          setAnalysis(res);
          if (!manualCategoryOverride) {
            setCategory(res.detectedCategory);
          }
        })
        .catch(() => {
          // silent suggestion fallback
        });
    }, 220);

    return () => clearTimeout(timer);
  }, [open, subject, description, manualCategoryOverride]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createQuery({
        requesterName,
        requesterEmail,
        subject,
        description,
        category,
        priority,
      });
      setCreatedTicket(created);
      onSubmitted(created);
      setRequesterName('');
      setRequesterEmail('');
      setSubject('');
      setDescription('');
      setManualCategoryOverride(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit support query.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Submit Support Query"
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
              Submit Support Query
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Queries are automatically categorized and matched against 110+ troubleshooting guides.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdTicket ? (
          <div className="p-8 space-y-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  Query logged as{' '}
                  <span className="font-mono tabular-nums">
                    {createdTicket.ticketNumber}
                  </span>
                </h3>
                <p className="text-sm text-slate-600">
                  Routed to <span className="font-medium text-slate-900">{createdTicket.category}</span> queue
                  and assigned to {createdTicket.assignedTo}.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm space-y-1.5">
              <div className="font-medium text-slate-900">{createdTicket.subject}</div>
              <div className="text-xs text-slate-500">
                Category: {createdTicket.category} · Priority: {createdTicket.priority} · Status: {createdTicket.status}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreatedTicket(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                Submit Another
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewQueue();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                <span>Open Query Queue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="qry-name"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="qry-name"
                  type="text"
                  required
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
              <div>
                <label
                  htmlFor="qry-email"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Work Email
                </label>
                <input
                  id="qry-email"
                  type="email"
                  required
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="qry-subject"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Issue Summary
              </label>
              <input
                id="qry-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Corporate VPN connects but internal DNS fails with NXDOMAIN"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="qry-desc"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Symptoms, Error Codes & Steps Taken
              </label>
              <textarea
                id="qry-desc"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened, any error codes (e.g. 0xc000007b, AADSTS50105), OS version, and troubleshooting already tried."
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            {/* Category Selector + Smart Classification Indicator */}
            <div className="space-y-2.5 pt-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-700">
                  Support Category
                </span>
                {analysis && analysis.matchedKeywords.length > 0 && (
                  <span className="text-xs text-slate-500">
                    Auto-detected:{' '}
                    <strong className="font-medium text-slate-800">
                      {analysis.detectedCategory}
                    </strong>{' '}
                    ({analysis.confidence} confidence · matched:{' '}
                    {analysis.matchedKeywords.slice(0, 3).join(', ')})
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                {ALL_CATEGORIES.map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setManualCategoryOverride(true);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label
                  htmlFor="qry-priority"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Impact Priority
                </label>
                <select
                  id="qry-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as QueryPriority)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                >
                  <option value="Low">Low — Minor question or workaround exists</option>
                  <option value="Medium">Medium — Normal workflow degraded</option>
                  <option value="High">High — Feature blocked for user</option>
                  <option value="Urgent">Urgent — Outage or security incident</option>
                </select>
              </div>
            </div>

            {/* Live Knowledge Base Suggestions */}
            {analysis && analysis.suggestions.length > 0 && (
              <div className="border-t border-slate-200 pt-5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-900">
                    Suggested Solutions from Knowledge Base
                  </h3>
                  <span className="text-xs text-slate-500">
                    Check if one of these resolves your issue before submitting
                  </span>
                </div>
                <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg bg-slate-50/50">
                  {analysis.suggestions.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      onClick={() => onSelectArticle(item._id)}
                      className="w-full text-left px-4 py-3 hover:bg-white transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          <span className="font-mono">{item.code}</span> · {item.category} · {item.summary}
                        </div>
                      </div>
                      <span className="text-xs font-medium text-blue-600 whitespace-nowrap shrink-0">
                        View Guide
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                disabled={submitting}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
              >
                {submitting ? 'Submitting...' : 'Submit Support Query'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
