"use client";
import SimpleTable from "@/components/SimpleTable";
import { Box, Button } from "@mui/material";

const columns = [
  { key: "name", label: "Product" },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category" },
  { key: "stock", label: "Stock" },
  { key: "location", label: "Location" },
];

const rows = [
  { name: "Laptop Model X", sku: "LAP-X-001", category: "Electronics", stock: 120, location: "WH-A" },
  { name: "Office Chair Pro", sku: "CHA-P-012", category: "Furniture", stock: 45, location: "WH-B" },
];

export default function Products() {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}><Button variant="contained">Add Product</Button></Box>
      <SimpleTable columns={columns} rows={rows} />
    </Box>
  );
}
