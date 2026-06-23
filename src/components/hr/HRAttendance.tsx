"use client";
import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";

const records = [
  { name: "Emily Johnson", status: "Checked in", time: "09:02" },
  { name: "Sophia Brown", status: "On Leave", time: "Full day" },
];

export default function HRAttendance() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Attendance Today</Typography>
      <List>
        {records.map((r, i) => (
          <ListItem key={i}>
            <ListItemText primary={r.name} secondary={`${r.status} — ${r.time}`} />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
