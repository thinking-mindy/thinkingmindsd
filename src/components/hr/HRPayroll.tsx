"use client";
import SimpleTable from "@/components/SimpleTable";
import { Box, Button } from "@mui/material";

const columns = [
  { key: "name", label: "Employee" },
  { key: "salary", label: "Monthly Salary" },
  { key: "status", label: "Status" },
];

const rows = [
  { name: "Emily Johnson", salary: "$8,000", status: "Paid" },
  { name: "Michael Williams", salary: "$7,200", status: "Pending" },
];

export default function HRPayroll() {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained">Run Payroll</Button>
      </Box>
      <SimpleTable columns={columns} rows={rows} />
    </Box>
  );
}
