#!/usr/bin/env node
/**
 * Reorder bridge functions so server import comes first and Tauri returns are cast
 * to the server action return type.
 */
import fs from 'node:fs';
import path from 'node:path';

const bridgeDir = path.join(process.cwd(), 'src/lib/desktop');
const skip = new Set(['admin-bridge.ts', 'auth-bridge.ts', 'runtime.ts']);

for (const file of fs.readdirSync(bridgeDir)) {
  if (!file.endsWith('-bridge.ts') || skip.has(file)) continue;
  const filePath = path.join(bridgeDir, file);
  let src = fs.readFileSync(filePath, 'utf8');
  const actionModule = file.replace('-bridge.ts', '');
  const actionImport =
    actionModule === 'receipt'
      ? '@/_actions/receipt-design'
      : actionModule === 'projects'
        ? '@/_actions/projects-tasks'
        : actionModule === 'audit'
          ? '@/_actions/audit-logs'
          : actionModule === 'user-profile'
            ? '@/_actions/user-profile'
            : actionModule === 'knowledge-base'
              ? '@/_actions/knowledge-base'
              : actionModule === 'user-requests'
                ? '@/_actions/user-requests'
                : actionModule === 'purchase-orders'
                  ? '@/_actions/purchase-orders'
                  : `@/_actions/${actionModule}`;

  // export async function foo(...) {
  //   if (isTauriBackendAvailable()) return tauri...;
  //   const { foo: serverFn } = await import('...');
  //   return serverFn(...);
  // }
  src = src.replace(
    /export async function (\w+)\(([^)]*)\)\s*\{\s*if \(isTauriBackendAvailable\(\)\) return ([^;]+);\s*const \{ (\w+): serverFn \} = await import\([^)]+\);\s*return serverFn\(([^)]*)\);\s*\}/g,
    (match, name, params, tauriCall, serverName, serverArgs) => {
      if (serverName !== name) return match;
      return `export async function ${name}(${params}) {
  const { ${name}: serverFn } = await import('${actionImport}');
  if (isTauriBackendAvailable()) {
    return (await ${tauriCall}) as Awaited<ReturnType<typeof serverFn>>;
  }
  return serverFn(${serverArgs});
}`;
    }
  );

  // multiline tauri with const res
  src = src.replace(
    /export async function (\w+)\(([^)]*)\)\s*\{\s*if \(isTauriBackendAvailable\(\)\) \{\s*([\s\S]*?)\s*\}\s*const \{ (\w+): serverFn \} = await import\([^)]+\);\s*return serverFn\(([^)]*)\);\s*\}/g,
    (match, name, params, tauriBody, serverName, serverArgs) => {
      if (serverName !== name) return match;
      return `export async function ${name}(${params}) {
  const { ${name}: serverFn } = await import('${actionImport}');
  if (isTauriBackendAvailable()) {
    ${tauriBody}
    return result as Awaited<ReturnType<typeof serverFn>>;
  }
  return serverFn(${serverArgs});
}`;
    }
  );

  fs.writeFileSync(filePath, src);
  console.log('patched', file);
}
