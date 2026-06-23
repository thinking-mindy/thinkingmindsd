export type StockCsvRow = {
  sku: string;
  name: string;
  quantity: number;
  location?: string;
  reorderLevel?: number;
  price?: number;
};

export const STOCK_CSV_HEADERS = [
  "sku",
  "name",
  "quantity",
  "location",
  "reorderLevel",
  "price",
] as const;

const HEADER_ALIASES: Record<string, keyof StockCsvRow> = {
  sku: "sku",
  "product sku": "sku",
  code: "sku",
  name: "name",
  "product name": "name",
  product: "name",
  item: "name",
  quantity: "quantity",
  qty: "quantity",
  stock: "quantity",
  "stock quantity": "quantity",
  location: "location",
  warehouse: "location",
  shelf: "location",
  reorderlevel: "reorderLevel",
  "reorder level": "reorderLevel",
  "min stock": "reorderLevel",
  "low stock threshold": "reorderLevel",
  price: "price",
  "unit price": "price",
  cost: "price",
};

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
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function normalizeHeader(h: string): keyof StockCsvRow | null {
  const key = h.trim().toLowerCase().replace(/[_-]/g, " ");
  return HEADER_ALIASES[key] ?? null;
}

export function parseStockCsv(text: string): { rows: StockCsvRow[]; errors: string[] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["File is empty"] };
  }

  const headerCells = parseCsvLine(lines[0]);
  const columnMap: Array<keyof StockCsvRow | null> = headerCells.map(normalizeHeader);

  if (!columnMap.includes("sku") || !columnMap.includes("name")) {
    return {
      rows: [],
      errors: ["CSV must include at least sku and name columns"],
    };
  }

  const rows: StockCsvRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.every((c) => !c)) continue;

    const row: Partial<StockCsvRow> = {};
    columnMap.forEach((field, idx) => {
      if (!field) return;
      const raw = cells[idx] ?? "";
      if (field === "quantity" || field === "reorderLevel" || field === "price") {
        const num = raw === "" ? undefined : Number(raw);
        if (raw !== "" && Number.isNaN(num)) {
          errors.push(`Row ${i + 1}: invalid number for ${field}`);
          return;
        }
        (row as any)[field] = num;
      } else {
        (row as any)[field] = raw;
      }
    });

    if (!row.sku?.trim()) {
      errors.push(`Row ${i + 1}: missing SKU`);
      continue;
    }
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 1}: missing name`);
      continue;
    }

    rows.push({
      sku: row.sku.trim(),
      name: row.name.trim(),
      quantity: row.quantity ?? 0,
      location: row.location?.trim() || undefined,
      reorderLevel: row.reorderLevel,
      price: row.price,
    });
  }

  return { rows, errors };
}

export function stockRowsToCsv(rows: StockCsvRow[]): string {
  const header = STOCK_CSV_HEADERS.join(",");
  const lines = rows.map((r) =>
    [
      r.sku,
      r.name,
      r.quantity ?? 0,
      r.location ?? "",
      r.reorderLevel ?? "",
      r.price ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadStockCsv(rows: StockCsvRow[], filename?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([stockRowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `inventory-stock-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function stockCsvTemplate(): string {
  return [
    STOCK_CSV_HEADERS.join(","),
    '"SKU-001","Sample Widget",50,"Warehouse A",10,9.99',
    '"SKU-002","Another Item",5,"Shelf B",15,24.50',
  ].join("\n");
}

export function downloadStockTemplate() {
  const blob = new Blob([stockCsvTemplate()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "inventory-stock-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}
