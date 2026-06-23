"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  LinearProgress,
  Stack,
  Typography,
  alpha,
} from "@mui/material";
import { Class, Payments, People, School } from "@mui/icons-material";
import ChildCareOutlined from "@mui/icons-material/ChildCareOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import AccountBalanceOutlined from "@mui/icons-material/AccountBalanceOutlined";
import { getSchoolDashboardStats } from "@/lib/desktop/school-bridge";
import { EDUCATION_LEVEL_META } from "@/lib/school-levels";
import LevelSwitcher from "../components/LevelSwitcher";
import { useSchoolLevel } from "../components/SchoolLevelContext";
import type { EducationLevel } from "@/types/school";

const LEVEL_ICONS: Record<EducationLevel, React.ReactNode> = {
  primary: <ChildCareOutlined />,
  high_school: <SchoolOutlined />,
  tertiary: <AccountBalanceOutlined />,
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, height: "100%" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(color, 0.12),
              color,
            }}
          >
            {icon}
          </Box>
        </Box>
        <Typography variant="h4" fontWeight={800}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function SchoolDashboardTab() {
  const { institutionTitle, enabledLevels } = useSchoolLevel();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    classCount: 0,
    schoolPayments: 0,
    feesThisMonth: 0,
    byLevel: [] as { level: EducationLevel; students: number; classes: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSchoolDashboardStats().then((res) => {
      if (res.success) setStats(res.data);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const maxStudents = Math.max(1, ...stats.byLevel.map((b) => b.students));

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack spacing={2} sx={{ mb: 3 }}>
        <Typography variant="body1" color="text.secondary" maxWidth={640}>
          <strong>{institutionTitle}</strong> — overview across primary, high school, and tertiary where enabled.
        </Typography>
        {enabledLevels.length > 1 && <LevelSwitcher compact />}
      </Stack>

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Total students" value={stats.totalStudents} icon={<People />} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Active" value={stats.activeStudents} icon={<School />} color="#2e7d32" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard label="Classes & programmes" value={stats.classCount} icon={<Class />} color="#ed6c02" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            label="Fees this month"
            value={formatCurrency(stats.feesThisMonth)}
            icon={<Payments />}
            color="#9c27b0"
          />
        </Grid>
      </Grid>

      {stats.byLevel.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Enrolment by level
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              {stats.byLevel.map(({ level, students, classes }) => {
                const meta = EDUCATION_LEVEL_META[level];
                return (
                  <Box key={level}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: meta.accent, display: "flex" }}>{LEVEL_ICONS[level]}</Box>
                        <Typography variant="body2" fontWeight={700}>
                          {meta.label}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {students} {meta.studentLabel.toLowerCase()}s · {classes} {meta.classPlural.toLowerCase()}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={(students / maxStudents) * 100}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: alpha(meta.accent, 0.12),
                        "& .MuiLinearProgress-bar": { bgcolor: meta.accent, borderRadius: 4 },
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Fee collections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {stats.schoolPayments} school-related cashier transactions recorded. Use the level switcher on Students and
            Classes tabs to manage each stream separately.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
