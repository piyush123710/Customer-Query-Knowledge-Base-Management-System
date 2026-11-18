import type {
  Article,
  ArticlesResponse,
  ArticleStatus,
  ArticleType,
  CategorySummary,
  QueriesResponse,
  QueryPriority,
  QueryStatus,
  SuggestResponse,
  SupportCategory,
  SupportQuery,
} from './types.ts';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  getArticles(params?: {
    q?: string;
    category?: string;
    type?: string;
    status?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  }): Promise<ArticlesResponse> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.category) search.set('category', params.category);
    if (params?.type) search.set('type', params.type);
    if (params?.status) search.set('status', params.status);
    if (params?.sort) search.set('sort', params.sort);
    if (params?.limit !== undefined) search.set('limit', String(params.limit));
    if (params?.offset !== undefined) search.set('offset', String(params.offset));
    const qs = search.toString();
    return request<ArticlesResponse>(`/api/articles${qs ? `?${qs}` : ''}`);
  },

  getArticle(id: string, trackView = false): Promise<Article> {
    return request<Article>(`/api/articles/${encodeURIComponent(id)}${trackView ? '?view=1' : ''}`);
  },

  createArticle(payload: {
    title: string;
    type: ArticleType;
    category: SupportCategory;
    subcategory: string;
    summary: string;
    overview: string;
    steps: string[];
    errorCodes: string[];
    keywords: string[];
    status: ArticleStatus;
    author: string;
  }): Promise<Article> {
    return request<Article>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateArticle(
    id: string,
    patch: Partial<{
      title: string;
      type: ArticleType;
      category: SupportCategory;
      subcategory: string;
      summary: string;
      overview: string;
      steps: string[];
      errorCodes: string[];
      keywords: string[];
      status: ArticleStatus;
      author: string;
    }>
  ): Promise<Article> {
    return request<Article>(`/api/articles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(patch),
    });
  },

  deleteArticle(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/articles/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  sendFeedback(id: string, helpful: boolean): Promise<Article> {
    return request<Article>(`/api/articles/${encodeURIComponent(id)}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  },

  getCategories(): Promise<CategorySummary[]> {
    return request<CategorySummary[]>('/api/categories');
  },

  suggestQuerySolutions(subject: string, description: string): Promise<SuggestResponse> {
    return request<SuggestResponse>('/api/queries/suggest', {
      method: 'POST',
      body: JSON.stringify({ subject, description }),
    });
  },

  getQueries(params?: {
    q?: string;
    category?: string;
    status?: string;
    priority?: string;
  }): Promise<QueriesResponse> {
    const search = new URLSearchParams();
    if (params?.q) search.set('q', params.q);
    if (params?.category) search.set('category', params.category);
    if (params?.status) search.set('status', params.status);
    if (params?.priority) search.set('priority', params.priority);
    const qs = search.toString();
    return request<QueriesResponse>(`/api/queries${qs ? `?${qs}` : ''}`);
  },

  createQuery(payload: {
    requesterName: string;
    requesterEmail: string;
    subject: string;
    description: string;
    category: SupportCategory;
    priority: QueryPriority;
  }): Promise<SupportQuery> {
    return request<SupportQuery>('/api/queries', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateQuery(
    id: string,
    patch: Partial<{
      category: SupportCategory;
      priority: QueryPriority;
      status: QueryStatus;
      resolutionNote: string;
      assignedTo: string;
      matchedArticleIds: string[];
    }>
  ): Promise<SupportQuery> {
    return request<SupportQuery>(`/api/queries/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  deleteQuery(id: string): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/api/queries/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
