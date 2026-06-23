export async function verifyWebhook(_req: Request) {
  return {
    type: 'noop',
    data: { id: 'local-webhook' },
  } as const;
}
