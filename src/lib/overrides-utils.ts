export function inferContentType(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith('.json')) return 'application/json';
  if (lower.endsWith('.md')) return 'text/markdown';
  if (lower.endsWith('.hbs')) return 'text/x-handlebars-template';
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'text/plain';
}

