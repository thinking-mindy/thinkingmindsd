import type { PostingDraft } from './postings';

/** Fire-and-forget GL posting — never blocks ops workflows */
export async function tryPostToLedger(orgId: string, draft: PostingDraft | null | undefined) {
  if (!draft) return;
  try {
    const { getAccountingSettings, postJournalEntry } = await import('@/_actions/accounting');
    const settings = await getAccountingSettings(orgId);
    if (!settings.success || settings.data?.autoPostFromOps === false) return;
    await postJournalEntry(orgId, draft);
  } catch (err) {
    console.warn('[accounting] auto-post skipped:', err);
  }
}
