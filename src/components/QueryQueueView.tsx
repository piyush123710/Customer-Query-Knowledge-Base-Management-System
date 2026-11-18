import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.ts';
import type {
  Article,
  QueryPriority,
  QueryStatus,
  SupportCategory,
  SupportQuery,
} from '../types.ts';
import { ALL_CATEGORIES, formatRelativeTime } from '../utils/format.ts';

interface QueryQueueViewProps {
  onOpenSubmitQuery: () => void;
  onSelectArticle: (articleId: string) => void;
  onQueriesChanged: () => void;
  refreshSignal: number;
}

function StatusLabel({ status }: { status: QueryStatus }) {
  if (status === 'Resolved') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Resolved</span>
      </span>
    );
  }
  if (status === 'In Progress') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>In Progress</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span>Open</span>
    </span>
  );
}

function PriorityLabel({ priority }: { priority: QueryPriority }) {
  const color =
    priority === 'Urgent'
      ? 'text-red-700 font-semibold'
      : priority === 'High'
      ? 'text-amber-700 font-medium'
      : 'text-slate-600';
  return <span className={`text-xs ${color}`}>{priority}</span>;
}

export function QueryQueueView({
  onOpenSubmitQuery,
  onSelectArticle,
  onQueriesChanged,
  refreshSignal,
}: QueryQueueViewProps) {
  const [queries, setQueries] = useState<SupportQuery[]>([]);
  const [counts, setCounts] = useState({
    all: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<QueryStatus | 'All'>('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected query drawer state
  const [selectedQuery, setSelectedQuery] = useState<SupportQuery | null>(null);
  const [editCategory, setEditCategory] = useState<SupportCategory>('Software');
  const [editStatus, setEditStatus] = useState<QueryStatus>('Open');
  const [editPriority, setEditPriority] = useState<QueryPriority>('Medium');
  const [editAssignee, setEditAssignee] = useState('');
  const [editNote, setEditNote] = useState('');
  const [matchedArticles, setMatchedArticles] = useState<Article[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .getQueries({
        q: search,
        category: categoryFilter,
        status: statusFilter,
      })
      .then((res) => {
        if (cancelled) return;
        setQueries(res.items);
        setCounts(res.counts);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load support queries.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [search, categoryFilter, statusFilter, refreshSignal]);

  useEffect(() => {
    if (!selectedQuery) {
      setMatchedArticles([]);
      return;
    }
    setEditCategory(selectedQuery.category);
    setEditStatus(selectedQuery.status);
    setEditPriority(selectedQuery.priority);
    setEditAssignee(selectedQuery.assignedTo);
    setEditNote(selectedQuery.resolutionNote);

    if (selectedQuery.matchedArticleIds.length > 0) {
      Promise.all(
        selectedQuery.matchedArticleIds.map((id) =>
          api.getArticle(id).catch(() => null)
        )
      ).then((results) => {
        setMatchedArticles(results.filter((a): a is Article => a !== null));
      });
    } else {
      api
        .getArticles({ category: selectedQuery.category, status: 'published', limit: 3 })
        .then((res) => setMatchedArticles(res.items))
        .catch(() => setMatchedArticles([]));
    }
  }, [selectedQuery]);

  const handleSaveQueryUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuery) return;
    setSaving(true);
    try {
      const updated = await api.updateQuery(selectedQuery._id, {
        category: editCategory,
        status: editStatus,
        priority: editPriority,
        assignedTo: editAssignee,
        resolutionNote: editNote,
      });
      setQueries((prev) =>
        prev.map((q) => (q._id === updated._id ? updated : q))
      );
      setSelectedQuery(updated);
      onQueriesChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuery = async (id: string) => {
    await api.deleteQuery(id);
    setSelectedQuery(null);
    onQueriesChanged();
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6 pb-16">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">
            Categorized Customer Query Queue
          </h1>
          <p className="text-sm text-slate-600 mt-1 tabular-nums">
            {counts.open} open · {counts.inProgress} in progress · {counts.resolved} resolved across 5 support categories
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSubmitQuery}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer Query</span>
        </button>
      </div>

      {/* Filters Toolbar */}
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
            All Categories
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
            {(['All', 'Open', 'In Progress', 'Resolved'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter ticket # or text..."
              aria-label="Filter support queries"
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 w-56"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-white border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* High-Density Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                <th className="py-3 px-4 whitespace-nowrap">Ticket</th>
                <th className="py-3 px-4">Subject & Requester</th>
                <th className="py-3 px-4 whitespace-nowrap">Category</th>
                <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                <th className="py-3 px-4 whitespace-nowrap">Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Assignee</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-3.5 px-4">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : queries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-sm text-slate-500">
                    No customer queries match the selected filters.
                  </td>
                </tr>
              ) : (
                queries.map((query) => (
                  <tr
                    key={query._id}
                    onClick={() => setSelectedQuery(query)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap">
                      {query.ticketNumber}
                    </td>
                    <td className="py-3 px-4 min-w-[280px]">
                      <div className="font-medium text-slate-900 line-clamp-1">
                        {query.subject}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {query.requesterName} · {query.requesterEmail}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {query.category}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityLabel priority={query.priority} />
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusLabel status={query.status} />
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {query.assignedTo}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 text-right tabular-nums whitespace-nowrap">
                      {formatRelativeTime(query.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Query Triage & Resolution Slide-Over */}
      {selectedQuery && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Manage ${selectedQuery.ticketNumber}`}
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
          onClick={() => setSelectedQuery(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full overflow-y-auto border-l border-slate-200 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                  {selectedQuery.ticketNumber} · Auto-detected: {selectedQuery.autoDetectedCategory}
                </div>
                <h2 className="font-display text-base font-bold text-slate-900 mt-0.5">
                  Query Triage & Resolution
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedQuery(null)}
                aria-label="Close triage drawer"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div className="space-y-2">
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {selectedQuery.subject}
                </h3>
                <p className="text-xs text-slate-500">
                  Submitted by <span className="text-slate-700 font-medium">{selectedQuery.requesterName}</span> ({selectedQuery.requesterEmail}) · {formatRelativeTime(selectedQuery.createdAt)}
                </p>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 leading-relaxed mt-2">
                  {selectedQuery.description}
                </div>
              </div>

              {matchedArticles.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-900">
                    Matched Knowledge Base Solutions
                  </div>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
                    {matchedArticles.map((art) => (
                      <button
                        key={art._id}
                        type="button"
                        onClick={() => onSelectArticle(art._id)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-900 truncate">
                            {art.title}
                          </div>
                          <div className="text-xs font-mono text-slate-500">
                            {art.code} · {art.category}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-blue-600 shrink-0">
                          Open
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveQueryUpdate} className="space-y-4 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="triage-category"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Assigned Category
                    </label>
                    <select
                      id="triage-category"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value as SupportCategory)}
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
                    <label
                      htmlFor="triage-status"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Workflow Status
                    </label>
                    <select
                      id="triage-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as QueryStatus)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Open">Open</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="triage-priority"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Priority
                    </label>
                    <select
                      id="triage-priority"
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value as QueryPriority)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="triage-assignee"
                      className="block text-xs font-medium text-slate-700 mb-1.5"
                    >
                      Assigned Engineer
                    </label>
                    <input
                      id="triage-assignee"
                      type="text"
                      value={editAssignee}
                      onChange={(e) => setEditAssignee(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="triage-note"
                    className="block text-xs font-medium text-slate-700 mb-1.5"
                  >
                    Resolution Note / Internal Triage Log
                  </label>
                  <textarea
                    id="triage-note"
                    rows={4}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Document root cause, steps verified with customer, or linked KB article..."
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => handleDeleteQuery(selectedQuery._id)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Query</span>
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors"
                  >
                    {saving ? 'Saving...' : 'Save Triage Update'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
