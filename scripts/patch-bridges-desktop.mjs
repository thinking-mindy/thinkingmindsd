#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const bridgeDir = path.join(process.cwd(), 'src/lib/desktop');
const files = [
  'finance-bridge.ts',
  'payroll-bridge.ts',
  'payments-bridge.ts',
  'user-profile-bridge.ts',
  'analytics-bridge.ts',
  'projects-bridge.ts',
  'currencies-bridge.ts',
];
const actionMap = {
  'finance-bridge.ts': '@/_actions/finance',
  'payroll-bridge.ts': '@/_actions/payroll',
  'payments-bridge.ts': '@/_actions/payments',
  'user-profile-bridge.ts': '@/_actions/user-profile',
  'analytics-bridge.ts': '@/_actions/analytics',
  'projects-bridge.ts': '@/_actions/projects-tasks',
  'currencies-bridge.ts': '@/_actions/currencies',
};

for (const f of files) {
  const p = path.join(bridgeDir, f);
  let s = fs.readFileSync(p, 'utf8');
  if (!s.includes("desktopBridge")) {
    s = s.replace(
      /import \{ isTauriBackendAvailable \} from '@\/lib\/desktop\/runtime';/,
      "import { desktopBridge } from '@/lib/desktop/bridge-utils';"
    );
  }
  s = s.replace(
    /export async function (\w+)\(([^)]*)\) \{\s*if \(isTauriBackendAvailable\(\)\) return ([^;]+);\s*const \{ (\w+): serverFn \} = await import\([^)]+\);\s*return serverFn\(([^)]*)\);\s*\}/g,
    (m, name, params, tauri, sn, args) => {
      if (sn !== name) return m;
      return `export async function ${name}(${params}) {
  const { ${name}: serverFn } = await import('${actionMap[f]}');
  return desktopBridge(() => ${tauri}, () => serverFn(${args}));
}`;
    }
  );
  fs.writeFileSync(p, s);
  console.log('patched', f);
}
