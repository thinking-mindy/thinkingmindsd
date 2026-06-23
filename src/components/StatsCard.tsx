"use client";
import { Card, CardContent, Typography, Box } from "@mui/material";

export default function StatsCard({ title, value, subtitle } : { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
          <Typography variant="h5" fontWeight="bold">{value}</Typography>
          {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
        </Box>
      </CardContent>
    </Card>
  );
}
