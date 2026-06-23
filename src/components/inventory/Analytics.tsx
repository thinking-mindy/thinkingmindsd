"use client";
import { Paper, Typography } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { category: "Electronics", stock: 120 },
  { category: "Furniture", stock: 45 },
  { category: "Stationery", stock: 90 },
];

export default function Analytics() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>Stock by Category</Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}><XAxis dataKey="category" /><YAxis /><Tooltip /><Bar dataKey="stock" /></BarChart>
      </ResponsiveContainer>
    </Paper>
  );
}
