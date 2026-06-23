"use client";

import { Rating, Box, Typography, Paper } from "@mui/material";

export default function PerformanceTab() {
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Performance Ratings
      </Typography>
      <Box>
        <Typography>Emily Johnson</Typography>
        <Rating value={4} readOnly />
      </Box>
      <Box>
        <Typography>Michael Williams</Typography>
        <Rating value={3} readOnly />
      </Box>
    </Paper>
  );
}
