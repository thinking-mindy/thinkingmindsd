"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, DeleteOutline, EditOutlined, Search } from "@mui/icons-material";
import {
  createSchoolStudent,
  deleteSchoolStudent,
  getSchoolClasses,
  getSchoolStudentsWithBalances,
  updateSchoolStudent,
} from "@/lib/desktop/school-bridge";
import { formatSchoolCurrency } from "@/lib/school-fees";
import { resolveEducationLevel } from "@/lib/school-levels";
import type { StudentTermFeeBalance } from "@/lib/school-fees";
import type { EducationLevel, SchoolClass, SchoolStudent } from "@/types/school";
import LevelSwitcher from "../components/LevelSwitcher";
import { useActiveLevelMeta, useSchoolLevel } from "../components/SchoolLevelContext";
import StudentDialog, { type StudentFormState } from "../components/StudentDialog";

const statusColor: Record<string, "success" | "default" | "warning"> = {
  active: "success",
  graduated: "default",
  withdrawn: "warning",
};

type StudentWithBalance = SchoolStudent & {
  feeBalance?: StudentTermFeeBalance;
  educationLevel?: EducationLevel;
};

export default function SchoolStudentsTab() {
  const { activeLevel } = useSchoolLevel();
  const meta = useActiveLevelMeta();
  const [students, setStudents] = useState<StudentWithBalance[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolStudent | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [sRes, cRes] = await Promise.all([
      getSchoolStudentsWithBalances(),
      getSchoolClasses(undefined, activeLevel),
    ]);
    if (sRes.success) setStudents(sRes.data as unknown as StudentWithBalance[]);
    if (cRes.success) setClasses(cRes.data);
  }, [activeLevel]);

  useEffect(() => {
    load();
  }, [load]);

  const levelStudents = useMemo(
    () => students.filter((s) => resolveEducationLevel(s.educationLevel) === activeLevel),
    [students, activeLevel]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return levelStudents;
    return levelStudents.filter(
      (s) =>
        s.studentNumber.toLowerCase().includes(q) ||
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q) ||
        s.className?.toLowerCase().includes(q) ||
        s.guardianName?.toLowerCase().includes(q)
    );
  }, [levelStudents, search]);

  const handleSave = async (form: StudentFormState) => {
    setSaving(true);
    try {
      const payload = {
        firstName: form.firstName,
        lastName: form.lastName,
        educationLevel: activeLevel,
        classId: form.classId || undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianEmail: form.guardianEmail || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        status: form.status,
        notes: form.notes || undefined,
      };
      const res = editing
        ? await updateSchoolStudent(editing._id!, payload)
        : await createSchoolStudent(payload);
      if (res.success) {
        setDialogOpen(false);
        setEditing(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this student?")) return;
    await deleteSchoolStudent(id);
    await load();
  };

  return (
    <Box>
      <LevelSwitcher />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
        {meta.studentLabel} directory for <strong>{meta.label}</strong>
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2.5 }} alignItems={{ sm: "center" }}>
        <TextField
          placeholder="Search by name, number, class…"
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 400 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Enrol {meta.studentLabel.toLowerCase()}
        </Button>
      </Stack>

      <TableContainer sx={{ borderRadius: 3, border: 1, borderColor: "divider" }}>
        <Table size="medium">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Student #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{meta.classLabel}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{meta.feePeriodLabel} balance</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Guardian</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No students yet. Add your first enrolment.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s._id} hover>
                  <TableCell>
                    <Chip label={s.studentNumber} size="small" variant="outlined" sx={{ fontWeight: 700, fontFamily: "monospace" }} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {s.firstName} {s.lastName}
                    </Typography>
                  </TableCell>
                  <TableCell>{s.className || "—"}</TableCell>
                  <TableCell sx={{ minWidth: 140 }}>
                    {s.feeBalance?.hasClassFees ? (
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={s.feeBalance.remainingBalance > 0 ? "error.main" : "success.main"}
                        >
                          {formatSchoolCurrency(s.feeBalance.remainingBalance)} left
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={s.feeBalance.percentPaid}
                          color={s.feeBalance.remainingBalance <= 0 ? "success" : "primary"}
                          sx={{ mt: 0.75, height: 5, borderRadius: 2 }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {s.feeBalance.termShortLabel} · {s.feeBalance.percentPaid}% paid
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        Set class fees
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{s.guardianName || "—"}</Typography>
                    {s.guardianPhone && (
                      <Typography variant="caption" color="text.secondary">
                        {s.guardianPhone}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={s.status} size="small" color={statusColor[s.status]} sx={{ textTransform: "capitalize" }} />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(s);
                          setDialogOpen(true);
                        }}
                      >
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(s._id!)}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <StudentDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
        classes={classes}
        student={editing}
        loading={saving}
        levelMeta={meta}
      />
    </Box>
  );
}
