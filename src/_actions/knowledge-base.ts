/** Auto-generated desktop stub for knowledge-base.ts */
export interface KnowledgeBaseArticle {
  _id?: string;
  orgId: string;
  title: string;
  content: string;
  category: string;
  views?: number;
  authorId?: string;
  tags?: string[];
  createdAt?: Date;
  updatedAt?: Date;
  lastUpdated?: Date;
}

export async function createArticle(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: createArticle is not available until this module is migrated to Rust.' };
}

export async function getArticle(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getArticle is not available until this module is migrated to Rust.' };
}

export async function getArticlesByOrg(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getArticlesByOrg is not available until this module is migrated to Rust.' };
}

export async function getArticlesByCategory(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: getArticlesByCategory is not available until this module is migrated to Rust.' };
}

export async function searchArticles(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: searchArticles is not available until this module is migrated to Rust.' };
}

export async function updateArticle(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: updateArticle is not available until this module is migrated to Rust.' };
}

export async function deleteArticle(..._args: unknown[]) {
  return { success: false as const, error: 'Desktop app: deleteArticle is not available until this module is migrated to Rust.' };
}
