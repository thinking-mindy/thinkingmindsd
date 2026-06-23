"use client";
import SimpleTable from "@/components/SimpleTable";

const columns = [
  { key: "product", label: "Product" },
  { key: "type", label: "Type" },
  { key: "qty", label: "Quantity" },
  { key: "date", label: "Date" },
];

const rows = [
  { product: "Laptop Model X", type: "IN", qty: 50, date: "2025-09-01" },
  { product: "Office Chair Pro", type: "OUT", qty: 10, date: "2025-09-03" },
];

export default function Stock() {
  return <SimpleTable columns={columns} rows={rows} />;
}
