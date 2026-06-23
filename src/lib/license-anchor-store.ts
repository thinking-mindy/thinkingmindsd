/**
 * Encrypted on-disk store for tamper-resistant licence registration anchors.
 */
import { chmodSync } from 'node:fs';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  parseEncryptedJsonFile,
  serializeEncryptedJsonFile,
} from '@/lib/local-db-crypto';

export const LICENSE_ANCHOR_PATH = path.join(process.cwd(), 'secrets', 'license-anchor.json');
export const LICENSE_ANCHOR_CRYPTO_CONTEXT = 'secrets:license-anchor.json';

export type LicenseAnchorEntry = {
  registeredAt: string;
  signature: string;
};

export type LicenseAnchorMap = Record<string, LicenseAnchorEntry>;

export async function loadLicenseAnchorMap(): Promise<LicenseAnchorMap> {
  try {
    const raw = await readFile(LICENSE_ANCHOR_PATH, 'utf8');
    const parsed = parseEncryptedJsonFile<LicenseAnchorMap>(raw, LICENSE_ANCHOR_CRYPTO_CONTEXT, {});
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }
}

export async function saveLicenseAnchorMap(map: LicenseAnchorMap): Promise<void> {
  await mkdir(path.dirname(LICENSE_ANCHOR_PATH), { recursive: true });
  const content = serializeEncryptedJsonFile(map, LICENSE_ANCHOR_CRYPTO_CONTEXT);
  const tmp = `${LICENSE_ANCHOR_PATH}.${process.pid}.tmp`;
  await writeFile(tmp, content, { encoding: 'utf8', mode: 0o600 });
  await rename(tmp, LICENSE_ANCHOR_PATH);
  try {
    chmodSync(LICENSE_ANCHOR_PATH, 0o600);
  } catch {
    /* Windows */
  }
}
