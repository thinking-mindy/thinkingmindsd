export type MovementCsvRow = {
  date: string;
  type: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  reason: string;
  reference: string;
};

export function movementsToCsv(rows: MovementCsvRow[]): string {
  const headers = ["date", "type", "itemName", "itemSku", "quantity", "reason", "reference"];
  const lines = rows.map((r) =>
    [r.date, r.type, r.itemName, r.itemSku, r.quantity, r.reason, r.reference]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

export function downloadMovementsCsv(rows: MovementCsvRow[], filename?: string) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([movementsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `stock-movements-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
