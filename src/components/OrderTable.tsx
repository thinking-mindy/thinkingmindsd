"use client";

import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";

const orders = [
  { id: 1, type: "Purchase", supplier: "Tech Supplies", total: 5000, date: "2025-09-05" },
  { id: 2, type: "Sales", customer: "ABC Corp", total: 3200, date: "2025-09-08" },
];

export default function OrderTable() {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Order Type</TableCell>
            <TableCell>Partner</TableCell>
            <TableCell>Total</TableCell>
            <TableCell>Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {orders.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{o.type}</TableCell>
              <TableCell>{o.supplier || o.customer}</TableCell>
              <TableCell>${o.total}</TableCell>
              <TableCell>{o.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
