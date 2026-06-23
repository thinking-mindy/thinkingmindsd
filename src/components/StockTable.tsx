"use client";

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";

const stockMovements = [
  { id: 1, product: "Laptop", type: "IN", qty: 50, date: "2025-09-01" },
  { id: 2, product: "Chair", type: "OUT", qty: 10, date: "2025-09-03" },
];

export default function StockTable() {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Product</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Quantity</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {stockMovements.map((s) => (
            <TableRow key={s.id}>
              <TableCell>{s.product}</TableCell>
              <TableCell>{s.type}</TableCell>
              <TableCell>{s.qty}</TableCell>
              <TableCell>{s.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
