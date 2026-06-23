export type SupplierCsvRow = {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  contactPerson?: string;
  status?: "active" | "inactive";
};

export const SUPPLIER_CSV_HEADERS = [
  "name",
  "contactEmail",
  "contactPhone",
  "address",
  "city",
  "state",
  "zipCode",
  "country",
  "website",
  "contactPerson",
  "status",
] as const;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else current += ch;
  }
  cells.push(current.trim());
  return cells;
}

const ALIASES: Record<string, keyof SupplierCsvRow> = {
  name: "name",
  supplier: "name",
  "company name": "name",
  email: "contactEmail",
  contactemail: "contactEmail",
  phone: "contactPhone",
  contactphone: "contactPhone",
  telephone: "contactPhone",
  address: "address",
  city: "city",
  state: "state",
  province: "state",
  zipcode: "zipCode",
  "zip code": "zipCode",
  postal: "zipCode",
  country: "country",
  website: "website",
  url: "website",
  contactperson: "contactPerson",
  "contact person": "contactPerson",
  status: "status",
};

export function parseSupplierCsv(text: string): { rows: SupplierCsvRow[]; errors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [], errors: ["File is empty"] };

  const columnMap = parseCsvLine(lines[0]).map((h) => ALIASES[h.trim().toLowerCase().replace(/[_-]/g, " ")] ?? null);
  if (!columnMap.includes("name")) return { rows: [], errors: ["CSV must include a name column"] };

  const rows: SupplierCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;
    const row: Partial<SupplierCsvRow> = {};
    columnMap.forEach((field, idx) => {
      if (!field) return;
      const raw = cells[idx] ?? "";
      if (field === "status") {
        row.status = raw.toLowerCase() === "inactive" ? "inactive" : "active";
      } else {
        (row as any)[field] = raw || undefined;
      }
    });
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }
    rows.push({ ...row, name: row.name.trim() } as SupplierCsvRow);
  }
  return { rows, errors };
}

export function suppliersToCsv(rows: SupplierCsvRow[]): string {
  const header = SUPPLIER_CSV_HEADERS.join(",");
  const lines = rows.map((r) =>
    SUPPLIER_CSV_HEADERS.map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadSuppliersCsv(rows: SupplierCsvRow[], filename?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([suppliersToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `suppliers-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function supplierCsvTemplate(): string {
  return [
    SUPPLIER_CSV_HEADERS.join(","),
    '"Acme Supplies","orders@acme.com","+1-555-0100","123 Industrial Way","Chicago","IL","60601","USA","https://acme.com","Jane Doe","active"',
  ].join("\n");
}

export function downloadSupplierTemplate() {
  const blob = new Blob([supplierCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "suppliers-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
