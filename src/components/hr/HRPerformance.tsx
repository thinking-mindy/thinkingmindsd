"use client";
import { Box, Typography } from "@mui/material";
import { Rating } from "@mui/material";

const data = [
  { name: "Emily Johnson", rating: 4, lastReview: "2025-08-12" },
  { name: "Michael Williams", rating: 3, lastReview: "2025-07-21" },
];

export default function HRPerformance() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Performance Overview</Typography>
      {data.map((d, i) => (
        <Box key={i} sx={{ mb: 2 }}>
          <Typography>{d.name} — last review: {d.lastReview}</Typography>
          <Rating value={d.rating} readOnly />
        </Box>
      ))}
    </Box>
  );
}
