import { invoke } from '@tauri-apps/api/core';
import type { TauriActionResult } from '@/lib/desktop/admin-types';
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';

function requireTauri(): void {
  if (!isTauriBackendAvailable()) {
    throw new Error('Tauri knowledge base API requires the desktop shell');
  }
}

export async function tauriKnowledgeBaseCreateArticle(data: Record<string, unknown>) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>>>('knowledge_base_create_article_cmd', {
    data,
  });
}

export async function tauriKnowledgeBaseGetArticle(articleId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>('knowledge_base_get_article_cmd', {
    articleId,
  });
}

export async function tauriKnowledgeBaseGetArticlesByOrg(orgId: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'knowledge_base_get_articles_by_org_cmd',
    { orgId }
  );
}

export async function tauriKnowledgeBaseGetArticlesByCategory(orgId: string, category: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>(
    'knowledge_base_get_articles_by_category_cmd',
    { orgId, category }
  );
}

export async function tauriKnowledgeBaseSearchArticles(orgId: string, query: string) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown>[]>>('knowledge_base_search_articles_cmd', {
    orgId,
    query,
  });
}

export async function tauriKnowledgeBaseUpdateArticle(
  articleId: string,
  data: Record<string, unknown>
) {
  requireTauri();
  return invoke<TauriActionResult<Record<string, unknown> | null>>(
    'knowledge_base_update_article_cmd',
    {
      articleId,
      data,
    }
  );
}

export async function tauriKnowledgeBaseDeleteArticle(articleId: string) {
  requireTauri();
  return invoke<TauriActionResult<boolean>>('knowledge_base_delete_article_cmd', { articleId });
}
