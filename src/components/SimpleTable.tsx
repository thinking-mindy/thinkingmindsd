"use client";
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";

type Column = { key: string; label: string; align?: "left"|"right"|"center" };

export default function SimpleTable({ columns, rows } : { columns: Column[]; rows: any[] }) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map(col => <TableCell key={col.key} align={col.align || "left"}>{col.label}</TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, idx) => (
            <TableRow key={idx}>
              {columns.map(c => <TableCell key={c.key} align={c.align || "left"}>{r[c.key]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
