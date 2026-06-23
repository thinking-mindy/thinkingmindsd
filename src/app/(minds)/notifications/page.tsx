"use client";
import { Typography, Box } from "@mui/material";
import SimpleTable from "@/components/SimpleTable";

export default function Page() {
  const columns = [{ key: "col1", label: "Item" }, { key: "col2", label: "Detail" }];
  const rows = [{ col1: "Notifications Example", col2: "System and user notifications." }];
  return (
    <Box sx={{ py: 1 ,width:"100%"}}>
      <Typography variant="h4">Notifications</Typography>
      <Typography color="text.secondary" gutterBottom>System and user notifications.</Typography>
      <SimpleTable columns={columns} rows={rows} />
    </Box>
  );
}
