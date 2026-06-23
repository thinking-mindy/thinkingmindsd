"use client";

import { Paper, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function AttendanceTab() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Attendance Records
      </Typography>
      <List>
        <ListItem>
          <ListItemText
            primary="Emily Johnson"
            secondary="Checked in at 09:00 AM"
          />
        </ListItem>
        <ListItem>
          <ListItemText
            primary="Michael Williams"
            secondary="On Leave (Sick)"
          />
        </ListItem>
      </List>
    </Paper>
  );
}
