/**
 * Local JSON database — MongoDB-shaped API for offline/dev use.
 * Each collection is a JSON file under `db/<database>/`.
 */
import { randomBytes } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cryptoContextForCollection,
  parseCollectionFileContent,
  serializeCollectionFileContent,
} from "@/lib/local-db-crypto";

export const LOCAL_DB_DIR = path.join(process.cwd(), "db");
export const LOCAL_DB_DEFAULT = "thinkingminds";

type Doc = Record<string, unknown>;
type Filter = Record<string, unknown>;
type SortSpec = Record<string, 1 | -1>;
type FindOptions = { projection?: Doc; sort?: SortSpec; limit?: number };

const COLLECTION_FILES: Record<string, string> = {
  users: "users.accounts.json",
  orgs: "orgs.organizations.json",
  plans: "plans.pricing.json",
  invoices: "invoices.billing.json",
  payments: "payments.transactions.json",
  expenses: "expenses.ledger.json",
  inventory_items: "inventory-items.stock.json",
  pos_orders: "pos-orders.sales.json",
  cashier_transactions: "cashier_transactions.json",
  purchase_orders: "purchase-orders.procurement.json",
  helpdesk_tickets: "helpdesk-tickets.support.json",
  contacts: "contacts.crm.json",
  projects: "projects.work.json",
  tasks: "tasks.work.json",
  work_board_config: "work_board_config.json",
  notifications: "notifications.system.json",
  usage_logs: "usage-logs.telemetry.json",
  assets: "assets.registry.json",
  stock_movements: "stock_movements.json",
  join_requests: "join_requests.json",
  suppliers: "suppliers.json",
  school_students: "school_students.json",
  school_classes: "school_classes.json",
  school_settings: "school_settings.json",
  chart_of_accounts: "chart_of_accounts.json",
  journal_entries: "journal_entries.json",
  accounting_settings: "accounting_settings.json",
  zimra_fiscal_settings: "zimra_fiscal_settings.json",
  zimra_fiscal_state: "zimra_fiscal_state.json",
};

// ─── low-level helpers ───────────────────────────────────────────────────────

export function collectionFile(collection: string): string {
  return COLLECTION_FILES[collection] ?? `${collection}.collection.json`;
}

function storageContext(dbName: string, collection: string): string {
  return cryptoContextForCollection(dbName, collectionFile(collection));
}

/** Serialize read/write cycles per collection file (parallel server actions share one process). */
const fileWriteChains = new Map<string, Promise<unknown>>();

function withFileLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = fileWriteChains.get(filePath) ?? Promise.resolve();
  const next = prev.catch(() => undefined).then(fn);
  fileWriteChains.set(filePath, next);
  return next.finally(() => {
    if (fileWriteChains.get(filePath) === next) fileWriteChains.delete(filePath);
  });
}

/** Read decrypted documents from an on-disk collection file (for backups / tooling). */
export async function readEncryptedCollectionFile(
  filePath: string,
  context: string
): Promise<Doc[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    return parseCollectionFileContent(raw, context);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

/** Write documents encrypted to an on-disk collection file. */
export async function writeEncryptedCollectionFile(
  filePath: string,
  context: string,
  docs: Doc[]
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const content = serializeCollectionFileContent(docs, context);
  const tmp = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;
  try {
    await writeFile(tmp, content, { encoding: "utf8", mode: 0o600 });
    await rename(tmp, filePath);
  } catch (error) {
    await unlink(tmp).catch(() => undefined);
    throw error;
  }
  try {
    chmodSync(filePath, 0o600);
  } catch {
    /* Windows may not support chmod */
  }
}

function newId(): string {
  const hex = "abcdef0123456789";
  let id = "";
  for (let i = 0; i < 24; i++) id += hex[Math.floor(Math.random() * hex.length)];
  return id;
}

function cmp(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && typeof (value as { toString?: () => string }).toString === "function") {
    const s = (value as { toString: () => string }).toString();
    if (s && s !== "[object Object]") return s;
  }
  return value;
}

function field(doc: Doc, path: string): unknown {
  return path.split(".").reduce<unknown>((obj, key) => {
    if (obj == null || typeof obj !== "object") return undefined;
    return (obj as Doc)[key];
  }, doc);
}

function setField(doc: Doc, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop();
  if (!last) return;
  let node: Doc = doc;
  for (const key of keys) {
    if (node[key] == null || typeof node[key] !== "object") node[key] = {};
    node = node[key] as Doc;
  }
  node[last] = value;
}

function matchValue(actual: unknown, condition: unknown): boolean {
  const a = cmp(actual);
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    const c = condition as Record<string, unknown>;
    if ("$in" in c) {
      const list = Array.isArray(c.$in) ? c.$in.map(cmp) : [];
      return list.includes(a);
    }
    if ("$regex" in c) {
      return new RegExp(String(c.$regex), String(c.$options ?? "")).test(String(actual ?? ""));
    }
    if ("$lt" in c) return String(a) < String(cmp(c.$lt));
    if ("$lte" in c) return String(a) <= String(cmp(c.$lte));
    if ("$gt" in c) return String(a) > String(cmp(c.$gt));
    if ("$gte" in c) return String(a) >= String(cmp(c.$gte));
    if ("$exists" in c) return Boolean(c.$exists) === (actual !== undefined);
  }
  return a === cmp(condition);
}

function match(doc: Doc, filter: Filter = {}): boolean {
  if (!filter || Object.keys(filter).length === 0) return true;
  if (Array.isArray(filter.$or) && !filter.$or.some((f) => match(doc, f as Filter))) return false;
  for (const [key, condition] of Object.entries(filter)) {
    if (key === "$or") continue;
    if (!matchValue(field(doc, key), condition)) return false;
  }
  return true;
}

function project(doc: Doc, projection?: Doc): Doc {
  if (!projection || Object.keys(projection).length === 0) return { ...doc };
  const include = Object.entries(projection).filter(([, v]) => Boolean(v)).map(([k]) => k);
  if (include.length > 0) {
    const out: Doc = {};
    for (const key of include) out[key] = field(doc, key);
    return out;
  }
  const out = { ...doc };
  for (const [key, v] of Object.entries(projection)) {
    if (!v) delete out[key];
  }
  return out;
}

function sortDocs(docs: Doc[], spec: SortSpec): Doc[] {
  const entries = Object.entries(spec);
  return [...docs].sort((a, b) => {
    for (const [key, dir] of entries) {
      const av = cmp(field(a, key));
      const bv = cmp(field(b, key));
      if (av === bv) continue;
      return String(av) > String(bv) ? dir : -dir;
    }
    return 0;
  });
}

function applyUpdate(doc: Doc, update: Doc): void {
  if (update.$set) {
    for (const [k, v] of Object.entries(update.$set as Doc)) setField(doc, k, v);
  }
  if (update.$inc) {
    for (const [k, v] of Object.entries(update.$inc as Doc)) {
      setField(doc, k, Number(field(doc, k) ?? 0) + Number(v));
    }
  }
}

// ─── file store ──────────────────────────────────────────────────────────────

class JsonStore {
  constructor(
    private dbName: string,
    private collection: string
  ) {}

  private async path(): Promise<string> {
    const dir = path.join(LOCAL_DB_DIR, this.dbName);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, collectionFile(this.collection));
    const legacy = path.join(dir, `${this.collection}.json`);
    try {
      await readFile(file, "utf8");
      return file;
    } catch {
      /* missing */
    }
    try {
      await readFile(legacy, "utf8");
      await rename(legacy, file);
      return file;
    } catch {
      /* missing */
    }
    return file;
  }

  private async readUnlocked(filePath: string): Promise<Doc[]> {
    const context = storageContext(this.dbName, this.collection);
    try {
      const raw = await readFile(filePath, "utf8");
      return parseCollectionFileContent(raw, context);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async writeUnlocked(filePath: string, docs: Doc[]): Promise<void> {
    const context = storageContext(this.dbName, this.collection);
    await writeEncryptedCollectionFile(filePath, context, docs);
  }

  async read(): Promise<Doc[]> {
    const filePath = await this.path();
    return withFileLock(filePath, () => this.readUnlocked(filePath));
  }

  async write(docs: Doc[]): Promise<void> {
    const filePath = await this.path();
    await withFileLock(filePath, () => this.writeUnlocked(filePath, docs));
  }

  /** Atomic read-modify-write under a per-file lock. */
  async mutate(mutator: (docs: Doc[]) => Doc[] | Promise<Doc[]>): Promise<void> {
    const filePath = await this.path();
    await withFileLock(filePath, async () => {
      const docs = await this.readUnlocked(filePath);
      const next = await mutator(docs);
      await this.writeUnlocked(filePath, next);
    });
  }
}

// ─── MongoDB-style cursor ────────────────────────────────────────────────────

export class FindCursor {
  constructor(
    private store: JsonStore,
    private filter: Filter,
    private opts: FindOptions = {}
  ) {}

  sort(spec: SortSpec): FindCursor {
    return new FindCursor(this.store, this.filter, { ...this.opts, sort: spec });
  }

  limit(n: number): FindCursor {
    return new FindCursor(this.store, this.filter, { ...this.opts, limit: n });
  }

  project(projection: Doc): FindCursor {
    return new FindCursor(this.store, this.filter, { ...this.opts, projection });
  }

  async toArray(): Promise<Doc[]> {
    let rows = (await this.store.read()).filter((d) => match(d, this.filter));
    if (this.opts.sort) rows = sortDocs(rows, this.opts.sort);
    if (this.opts.limit != null) rows = rows.slice(0, this.opts.limit);
    return rows.map((d) => project(d, this.opts.projection));
  }
}

// ─── collection (CRUD) ───────────────────────────────────────────────────────

export class LocalCollection {
  private store: JsonStore;

  constructor(dbName: string, name: string) {
    this.store = new JsonStore(dbName, name);
  }

  find(filter: Filter = {}, options?: { projection?: Doc }): FindCursor {
    return new FindCursor(this.store, filter, { projection: options?.projection });
  }

  async findOne(filter: Filter = {}, options?: { projection?: Doc }): Promise<Doc | null> {
    const doc = (await this.store.read()).find((d) => match(d, filter));
    return doc ? project(doc, options?.projection) : null;
  }

  async insertOne(doc: Doc) {
    const _id = cmp(doc._id) ?? newId();
    const record = { ...doc, _id };
    await this.store.mutate((docs) => {
      docs.push(record);
      return docs;
    });
    return { acknowledged: true, insertedId: _id };
  }

  async updateOne(filter: Filter, update: Doc) {
    let matched = 0;
    await this.store.mutate((docs) => {
      const idx = docs.findIndex((d) => match(d, filter));
      if (idx < 0) return docs;
      applyUpdate(docs[idx], update);
      matched = 1;
      return docs;
    });
    return { acknowledged: true, matchedCount: matched, modifiedCount: matched };
  }

  async updateMany(filter: Filter, update: Doc) {
    let modified = 0;
    await this.store.mutate((docs) => {
      for (const doc of docs) {
        if (!match(doc, filter)) continue;
        applyUpdate(doc, update);
        modified++;
      }
      return docs;
    });
    return { acknowledged: true, matchedCount: modified, modifiedCount: modified };
  }

  async deleteOne(filter: Filter) {
    let deleted = 0;
    await this.store.mutate((docs) => {
      const idx = docs.findIndex((d) => match(d, filter));
      if (idx < 0) return docs;
      docs.splice(idx, 1);
      deleted = 1;
      return docs;
    });
    return { acknowledged: true, deletedCount: deleted };
  }

  async deleteMany(filter: Filter) {
    let deletedCount = 0;
    await this.store.mutate((docs) => {
      const kept = docs.filter((d) => !match(d, filter));
      deletedCount = docs.length - kept.length;
      return kept;
    });
    return { acknowledged: true, deletedCount };
  }

  async findOneAndUpdate(filter: Filter, update: Doc, options?: { projection?: Doc }) {
    await this.updateOne(filter, update);
    const value = await this.findOne(filter, { projection: options?.projection });
    return { value };
  }

  async countDocuments(filter: Filter = {}) {
    const docs = await this.store.read();
    return docs.filter((d) => match(d, filter)).length;
  }

  aggregate(pipeline: Doc[]) {
    const store = this.store;
    return {
      toArray: async () => {
        let docs = await store.read();
        for (const stage of pipeline) {
          if (stage.$match) {
            docs = docs.filter((d) => match(d, stage.$match as Filter));
            continue;
          }
          if (stage.$group) {
            const group = stage.$group as Doc;
            const buckets = new Map<string, Doc>();

            for (const doc of docs) {
              let bucketId: unknown = null;
              const idSpec = group._id;
              if (idSpec === null || idSpec === undefined) {
                bucketId = null;
              } else if (typeof idSpec === "string" && idSpec.startsWith("$")) {
                bucketId = field(doc, idSpec.slice(1));
              } else {
                bucketId = idSpec;
              }

              const bucketKey = String(cmp(bucketId));
              if (!buckets.has(bucketKey)) {
                const row: Doc = { _id: bucketId };
                for (const [key, spec] of Object.entries(group)) {
                  if (key === "_id") continue;
                  if (spec && typeof spec === "object" && "$sum" in (spec as Doc)) {
                    row[key] = 0;
                  }
                }
                buckets.set(bucketKey, row);
              }

              const row = buckets.get(bucketKey)!;
              for (const [key, spec] of Object.entries(group)) {
                if (key === "_id") continue;
                if (!spec || typeof spec !== "object" || !("$sum" in (spec as Doc))) continue;
                const sumField = (spec as Doc).$sum;
                if (sumField === 1) {
                  row[key] = Number(row[key] ?? 0) + 1;
                } else if (typeof sumField === "string" && sumField.startsWith("$")) {
                  row[key] = Number(row[key] ?? 0) + Number(field(doc, sumField.slice(1)) ?? 0);
                } else if (typeof sumField === "number") {
                  row[key] = Number(row[key] ?? 0) + sumField;
                }
              }
            }

            docs = Array.from(buckets.values());
          }
        }
        return docs;
      },
    };
  }
}

// ─── database & client ───────────────────────────────────────────────────────

export class LocalDatabase {
  constructor(private name: string) {
    mkdirSync(path.join(LOCAL_DB_DIR, name), { recursive: true });
  }

  collection(name: string): LocalCollection {
    return new LocalCollection(this.name, name);
  }
}

export class LocalJsonClient {
  async connect() {
    await mkdir(LOCAL_DB_DIR, { recursive: true });
    return this;
  }

  db(name: string): LocalDatabase {
    return new LocalDatabase(name);
  }
}

// Back-compat aliases used by mongodb.ts
export { LocalCollection as LocalJsonCollection, LocalDatabase as LocalJsonDatabase };

// ─── simple CRUD helpers ─────────────────────────────────────────────────────

let _client: LocalJsonClient | undefined;

export function localClient(): LocalJsonClient {
  if (!_client) _client = new LocalJsonClient();
  return _client;
}

export async function localDb(dbName = LOCAL_DB_DEFAULT): Promise<LocalDatabase> {
  await localClient().connect();
  return localClient().db(dbName);
}

export async function localCol(dbName: string, collection: string): Promise<LocalCollection> {
  const db = await localDb(dbName);
  return db.collection(collection);
}

/** find().sort().limit().toArray() — or pass sort/limit in opts */
export async function findMany(
  collection: string,
  filter: Filter = {},
  opts?: FindOptions & { db?: string }
): Promise<Doc[]> {
  const col = await localCol(opts?.db ?? LOCAL_DB_DEFAULT, collection);
  let cursor = col.find(filter, { projection: opts?.projection });
  if (opts?.sort) cursor = cursor.sort(opts.sort);
  if (opts?.limit != null) cursor = cursor.limit(opts.limit);
  return cursor.toArray();
}

export async function findOneDoc(
  collection: string,
  filter: Filter,
  opts?: { projection?: Doc; db?: string }
): Promise<Doc | null> {
  const col = await localCol(opts?.db ?? LOCAL_DB_DEFAULT, collection);
  return col.findOne(filter, { projection: opts?.projection });
}

export async function insertDoc(
  collection: string,
  doc: Doc,
  dbName = LOCAL_DB_DEFAULT
) {
  const col = await localCol(dbName, collection);
  return col.insertOne(doc);
}

export async function updateDoc(
  collection: string,
  filter: Filter,
  update: Doc,
  dbName = LOCAL_DB_DEFAULT
) {
  const col = await localCol(dbName, collection);
  return col.updateMany(filter, update);
}

export async function deleteDoc(
  collection: string,
  filter: Filter,
  dbName = LOCAL_DB_DEFAULT
) {
  const col = await localCol(dbName, collection);
  return col.deleteMany(filter);
}

export async function countDocs(
  collection: string,
  filter: Filter = {},
  dbName = LOCAL_DB_DEFAULT
) {
  const col = await localCol(dbName, collection);
  return col.countDocuments(filter);
}
