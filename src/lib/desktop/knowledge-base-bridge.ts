/**
 * Knowledge base API — Rust/Tauri when available, Next server actions otherwise.
 */
import { isTauriBackendAvailable } from '@/lib/desktop/runtime';
import {
  tauriKnowledgeBaseCreateArticle,
  tauriKnowledgeBaseDeleteArticle,
  tauriKnowledgeBaseGetArticle,
  tauriKnowledgeBaseGetArticlesByCategory,
  tauriKnowledgeBaseGetArticlesByOrg,
  tauriKnowledgeBaseSearchArticles,
  tauriKnowledgeBaseUpdateArticle,
} from '@/lib/desktop/knowledge-base';

export async function createArticle(data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseCreateArticle(data);
  const { createArticle: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(data as never);
}

export async function getArticle(articleId: string) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseGetArticle(articleId);
  const { getArticle: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(articleId);
}

export async function getArticlesByOrg(orgId: string) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseGetArticlesByOrg(orgId);
  const { getArticlesByOrg: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(orgId);
}

export async function getArticlesByCategory(orgId: string, category: string) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseGetArticlesByCategory(orgId, category);
  const { getArticlesByCategory: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(orgId, category);
}

export async function searchArticles(orgId: string, query: string) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseSearchArticles(orgId, query);
  const { searchArticles: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(orgId, query);
}

export async function updateArticle(articleId: string, data: Record<string, unknown>) {
  if (isTauriBackendAvailable()) return tauriKnowledgeBaseUpdateArticle(articleId, data);
  const { updateArticle: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(articleId, data as never);
}

export async function deleteArticle(articleId: string) {
  if (isTauriBackendAvailable()) {
    const res = await tauriKnowledgeBaseDeleteArticle(articleId);
    if (res.success && res.data) return { success: true as const };
    return { success: false as const, error: res.error ?? 'Failed to delete article' };
  }
  const { deleteArticle: serverFn } = await import('@/_actions/knowledge-base');
  return serverFn(articleId);
}
