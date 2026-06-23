"use client";
import SimpleTable from "@/components/SimpleTable";

const columns = [
  { key: "name", label: "Supplier" },
  { key: "contact", label: "Contact" },
  { key: "phone", label: "Phone" },
];

const rows = [
  { name: "Tech Supplies Inc.", contact: "tech@supplies.com", phone: "555-1234" },
  { name: "Furniture World", contact: "sales@fworld.com", phone: "555-5678" },
];

export default function Suppliers() {
  return <SimpleTable columns={columns} rows={rows} />;
}
