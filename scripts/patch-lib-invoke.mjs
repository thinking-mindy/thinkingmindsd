#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const libPath = path.join(root, 'src-tauri/src/lib.rs');
const commandsDir = path.join(root, 'src-tauri/src/commands');

const moduleMap = Object.fromEntries(
  fs.readdirSync(commandsDir)
    .filter((f) => f.endsWith('.rs') && f !== 'mod.rs')
    .map((f) => [f.replace(/\.rs$/, ''), f.replace(/\.rs$/, '')])
);

const entries = [
  'commands::health_check',
  'commands::get_app_paths',
  'commands::list_db_collections',
  'commands::read_collection',
  'commands::write_collection',
];

for (const file of fs.readdirSync(commandsDir).sort()) {
  if (!file.endsWith('.rs') || file === 'mod.rs') continue;
  const mod = moduleMap[file.replace(/\.rs$/, '')];
  const text = fs.readFileSync(path.join(commandsDir, file), 'utf8');
  const fns = [...text.matchAll(/pub fn ([a-z0-9_]+)\s*\(/g)].map((m) => m[1]);
  for (const fn of fns) {
    if (fn === 'HealthResponse' || fn === 'AppPaths') continue;
    entries.push(`commands::${mod}::${fn}`);
  }
}

const invokeBlock = entries.map((e) => `            ${e},`).join('\n');
let lib = fs.readFileSync(libPath, 'utf8');
lib = lib.replace(
  /invoke_handler\(tauri::generate_handler!\[[\s\S]*?\]\)/,
  `invoke_handler(tauri::generate_handler![\n${invokeBlock}\n        ])`
);
fs.writeFileSync(libPath, lib);
console.log(`Registered ${entries.length} commands in lib.rs`);
