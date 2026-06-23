"use client";
import SimpleTable from "@/components/SimpleTable";
import { Button, Box } from "@mui/material";

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
  { key: "status", label: "Status" },
];

const rows = [
  { name: "Emily Johnson", email: "emily.j@company.com", department: "Engineering", role: "Senior Engineer", status: "Active" },
  { name: "Michael Williams", email: "michael.w@company.com", department: "Marketing", role: "Manager", status: "Active" },
  { name: "Sophia Brown", email: "sophia.b@company.com", department: "Sales", role: "Sales Lead", status: "On Leave" },
];

export default function EmployeeTable() {
  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained">Add Employee</Button>
      </Box>
      <SimpleTable columns={columns} rows={rows} />
    </Box>
  );
}
