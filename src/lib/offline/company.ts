"use client";

import { offlineStorage } from "./storage";
import type { LicenseStatus } from "@/lib/license-utils";
import {
  decryptLicenseDateField,
  encryptLicenseDateField,
  isEncryptedLicenseDate,
} from "@/lib/offline/license-field-crypto";

const TRIAL_DAYS = 30;

export interface OfflineCompany {
  id: string;
  name: string;
  createdByUserId: string;
  createdAt: number;
  trialStartedAt: string;
  licenseExpiresAt: string;
}

export interface OfflineJoinRequest {
  id: string;
  companyId: string;
  userId: string;
  email: string;
  name: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}

const COMPANIES_FILE = "companies.json";
const JOIN_REQUESTS_FILE = "join-requests.json";

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function makeObjectIdLike(): string {
  const chars = "abcdef0123456789";
  let out = "";
  for (let i = 0; i < 24; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function decryptCompanyDates(company: OfflineCompany): Promise<OfflineCompany> {
  const trialStartedAt =
    (await decryptLicenseDateField('trialStartedAt', company.trialStartedAt)) ??
    new Date(company.createdAt).toISOString();
  const licenseExpiresAt =
    (await decryptLicenseDateField('licenseExpiresAt', company.licenseExpiresAt)) ??
    new Date(new Date(trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return { ...company, trialStartedAt, licenseExpiresAt };
}

async function encryptCompanyDates(company: OfflineCompany): Promise<OfflineCompany> {
  const plain = await decryptCompanyDates(company);
  return {
    ...company,
    trialStartedAt: await encryptLicenseDateField('trialStartedAt', plain.trialStartedAt),
    licenseExpiresAt: await encryptLicenseDateField('licenseExpiresAt', plain.licenseExpiresAt),
  };
}

export async function getOfflineCompanies(): Promise<OfflineCompany[]> {
  try {
    const data = await offlineStorage.loadFromFile(COMPANIES_FILE);
    if (!Array.isArray(data)) return [];

    const raw = data as OfflineCompany[];
    const needsMigration = raw.some(
      (c) => !isEncryptedLicenseDate(c.trialStartedAt) || !isEncryptedLicenseDate(c.licenseExpiresAt)
    );
    if (needsMigration) {
      try {
        const encrypted = await Promise.all(raw.map(encryptCompanyDates));
        await offlineStorage.saveToFile(COMPANIES_FILE, encrypted);
      } catch {
        /* migration optional — return readable companies without blocking login */
      }
    }

    return Promise.all(raw.map(decryptCompanyDates));
  } catch {
    return [];
  }
}

export async function searchOfflineCompanies(query: string): Promise<OfflineCompany[]> {
  const companies = await getOfflineCompanies();
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter((c) => c.name.toLowerCase().includes(q));
}

export async function hasOfflineCompanies(): Promise<boolean> {
  const companies = await getOfflineCompanies();
  return companies.length > 0;
}

export async function createOfflineCompany(
  companyName: string,
  createdByUserId: string
): Promise<{ success: boolean; error?: string; company?: OfflineCompany }> {
  const name = companyName.trim();
  if (!name) return { success: false, error: "Company name is required" };

  const companies = await getOfflineCompanies();
  const exists = companies.some((c) => c.name.toLowerCase() === name.toLowerCase());
  if (exists) return { success: false, error: "A company with this name already exists" };

  const trialIso = new Date().toISOString();
  const expiryIso = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const company: OfflineCompany = {
    id: makeObjectIdLike(),
    name,
    createdByUserId,
    createdAt: Date.now(),
    trialStartedAt: await encryptLicenseDateField('trialStartedAt', trialIso),
    licenseExpiresAt: await encryptLicenseDateField('licenseExpiresAt', expiryIso),
  };
  companies.push(company);
  await offlineStorage.saveToFile(COMPANIES_FILE, companies);
  return { success: true, company };
}

export async function getOfflineLicenseStatus(companyId: string): Promise<LicenseStatus | null> {
  const companies = await getOfflineCompanies();
  const company = companies.find((c) => c.id === companyId);
  if (!company) return null;

  const decrypted = await decryptCompanyDates(company);
  const trialStartedAt = decrypted.trialStartedAt;
  const licenseExpiresAt = decrypted.licenseExpiresAt;

  const now = Date.now();
  const expiryMs = new Date(licenseExpiresAt).getTime();
  const diffMs = expiryMs - now;
  const isExpired = diffMs <= 0;
  const daysRemaining = isExpired ? 0 : Math.ceil(diffMs / (24 * 60 * 60 * 1000));

  return {
    orgId: company.id,
    trialStartedAt,
    licenseExpiresAt,
    daysRemaining,
    isExpired,
    isInTrial: true,
    planSlug: "free",
    tier: "company",
    priceMonthly: 149,
    currency: "USD",
  };
}

export async function getOfflineJoinRequests(): Promise<OfflineJoinRequest[]> {
  const data = await offlineStorage.loadFromFile(JOIN_REQUESTS_FILE);
  return Array.isArray(data) ? (data as OfflineJoinRequest[]) : [];
}

export async function deleteOfflineCompany(
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const data = await offlineStorage.loadFromFile(COMPANIES_FILE);
  if (!Array.isArray(data)) {
    return { success: false, error: "Company not found" };
  }

  const companies = data as OfflineCompany[];
  const filtered = companies.filter((c) => c.id !== companyId);
  if (filtered.length === companies.length) {
    return { success: false, error: "Company not found" };
  }

  await offlineStorage.saveToFile(COMPANIES_FILE, filtered);

  const requests = await getOfflineJoinRequests();
  const nextRequests = requests.filter((r) => r.companyId !== companyId);
  if (nextRequests.length !== requests.length) {
    await offlineStorage.saveToFile(JOIN_REQUESTS_FILE, nextRequests);
  }

  return { success: true };
}

export async function deleteOfflineJoinRequestsForUser(userId: string): Promise<void> {
  const requests = await getOfflineJoinRequests();
  const next = requests.filter((r) => r.userId !== userId);
  if (next.length !== requests.length) {
    await offlineStorage.saveToFile(JOIN_REQUESTS_FILE, next);
  }
}

export async function createOfflineJoinRequest(input: {
  companyId: string;
  userId: string;
  email: string;
  name: string;
}): Promise<{ success: boolean; error?: string; request?: OfflineJoinRequest }> {
  const requests = (await offlineStorage.loadFromFile(JOIN_REQUESTS_FILE)) as OfflineJoinRequest[] | null;
  const current = Array.isArray(requests) ? requests : [];
  const dupe = current.find(
    (r) => r.companyId === input.companyId && r.userId === input.userId && r.status === "pending"
  );
  if (dupe) return { success: false, error: "You already have a pending request for this company" };

  const request: OfflineJoinRequest = {
    id: makeId("join"),
    companyId: input.companyId,
    userId: input.userId,
    email: input.email,
    name: input.name,
    status: "pending",
    createdAt: Date.now(),
  };
  current.push(request);
  await offlineStorage.saveToFile(JOIN_REQUESTS_FILE, current);
  return { success: true, request };
}
