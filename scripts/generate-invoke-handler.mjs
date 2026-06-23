#!/usr/bin/env node
/**
 * Emit Tauri invoke_handler entries from src-tauri/src/commands/*.rs
 */
import fs from 'node:fs';
import path from 'node:path';

const commandsDir = path.join(process.cwd(), 'src-tauri/src/commands');
const skip = new Set(['mod.rs']);
const moduleMap = {
  admin: 'admin',
  analytics: 'analytics',
  auth: 'auth',
  crm: 'crm',
  currencies: 'currencies',
  finance: 'finance',
  inventory: 'inventory',
  join_requests: 'join_requests',
  licensing: 'licensing',
  orgs: 'orgs',
  overrides: 'overrides',
  payments: 'payments',
  payroll: 'payroll',
  plans: 'plans',
  pos: 'pos',
  projects: 'projects',
  purchase_orders: 'purchase_orders',
  receipt: 'receipt',
  school: 'school',
  user_profile: 'user_profile',
  users: 'users',
};

const entries = [];
for (const file of fs.readdirSync(commandsDir).sort()) {
  if (skip.has(file) || !file.endsWith('.rs')) continue;
  const mod = file.replace(/\.rs$/, '');
  const rustMod = moduleMap[mod] ?? mod;
  const text = fs.readFileSync(path.join(commandsDir, file), 'utf8');
  const re = /pub fn ([a-z0-9_]+_cmd)\s*\(/g;
  let m;
  while ((m = re.exec(text))) {
    entries.push(`            commands::${rustMod}::${m[1]},`);
  }
}

// Base commands from mod.rs
const base = [
  'commands::health_check',
  'commands::get_app_paths',
  'commands::list_db_collections',
  'commands::read_collection',
  'commands::write_collection',
];

const all = [...base.map((b) => `            ${b},`), ...entries];
process.stdout.write(all.join('\n'));
