export type SupportCategory =
  | 'Hardware'
  | 'Software'
  | 'Network'
  | 'Account'
  | 'Security';

export type ArticleType = 'faq' | 'guide';

export type ArticleStatus = 'published' | 'draft' | 'archived';

export type QueryStatus = 'Open' | 'In Progress' | 'Resolved';

export type QueryPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Article {
  _id: string;
  code: string;
  title: string;
  slug: string;
  type: ArticleType;
  category: SupportCategory;
  subcategory: string;
  summary: string;
  overview: string;
  steps: string[];
  errorCodes: string[];
  keywords: string[];
  helpfulCount: number;
  notHelpfulCount: number;
  views: number;
  status: ArticleStatus;
  author: string;
  updatedAt: string;
  createdAt: string;
}

export interface SupportQuery {
  _id: string;
  ticketNumber: string;
  requesterName: string;
  requesterEmail: string;
  subject: string;
  description: string;
  category: SupportCategory;
  autoDetectedCategory: SupportCategory;
  priority: QueryPriority;
  status: QueryStatus;
  matchedArticleIds: string[];
  resolutionNote: string;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CategorySummary {
  category: SupportCategory;
  description: string;
  totalArticles: number;
  publishedArticles: number;
  faqCount: number;
  guideCount: number;
  openQueries: number;
  totalViews: number;
  subcategories: string[];
}

export interface ArticlesResponse {
  items: Article[];
  total: number;
  counts: {
    all: number;
    published: number;
    draft: number;
    archived: number;
    faq: number;
    guide: number;
  };
}

export interface QueriesResponse {
  items: SupportQuery[];
  total: number;
  counts: {
    all: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface SuggestResponse {
  detectedCategory: SupportCategory;
  confidence: 'high' | 'medium' | 'low';
  matchedKeywords: string[];
  suggestions: Article[];
}
