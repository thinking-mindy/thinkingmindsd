"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
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
  alpha,
} from "@mui/material";
import { Add, AutoAwesome, DeleteOutline, EditOutlined } from "@mui/icons-material";
import {
  createSchoolClass,
  createSchoolClassesFromTemplates,
  deleteSchoolClass,
  getSchoolClasses,
  updateSchoolClass,
} from "@/lib/desktop/school-bridge";
import { formatSchoolCurrency } from "@/lib/school-fees";
import { EDUCATION_LEVEL_META } from "@/lib/school-levels";
import LevelSwitcher from "../components/LevelSwitcher";
import { useActiveLevelMeta, useSchoolLevel } from "../components/SchoolLevelContext";
import type { SchoolClass } from "@/types/school";

export default function SchoolClassesTab() {
  const { activeLevel } = useSchoolLevel();
  const meta = useActiveLevelMeta();
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [name, setName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [room, setRoom] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [faculty, setFaculty] = useState("");
  const [program, setProgram] = useState("");
  const [feesPerTerm, setFeesPerTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setGradeLevel("");
    setRoom("");
    setTeacherName("");
    setFaculty("");
    setProgram("");
    setFeesPerTerm("");
    setEditingId(null);
  }, []);

  const load = useCallback(async () => {
    const res = await getSchoolClasses(undefined, activeLevel);
    if (res.success) setClasses(res.data);
  }, [activeLevel]);

  useEffect(() => {
    void load();
    resetForm();
  }, [load, activeLevel, resetForm]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const fees = parseFloat(feesPerTerm);
    const payload = {
      educationLevel: activeLevel,
      name: name.trim(),
      gradeLevel: gradeLevel.trim() || undefined,
      room: room.trim() || undefined,
      teacherName: teacherName.trim() || undefined,
      faculty: activeLevel === "tertiary" ? faculty.trim() || undefined : undefined,
      program: activeLevel === "tertiary" ? program.trim() || undefined : undefined,
      feesPerTerm: Number.isFinite(fees) && fees >= 0 ? fees : undefined,
    };
    if (editingId) {
      await updateSchoolClass(editingId, payload);
    } else {
      await createSchoolClass(payload);
    }
    resetForm();
    await load();
  };

  const startEdit = (c: SchoolClass) => {
    setEditingId(c._id!);
    setName(c.name);
    setGradeLevel(c.gradeLevel ?? "");
    setRoom(c.room ?? "");
    setTeacherName(c.teacherName ?? "");
    setFaculty(c.faculty ?? "");
    setProgram(c.program ?? "");
    setFeesPerTerm(c.feesPerTerm != null ? String(c.feesPerTerm) : "");
  };

  const seedTemplates = async () => {
    setSeeding(true);
    await createSchoolClassesFromTemplates(activeLevel);
    await load();
    setSeeding(false);
  };

  const feeLabel = meta.feePeriodLabel.toLowerCase();

  return (
    <Box>
      <LevelSwitcher />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2 }}>
        {meta.classPlural} for <strong>{meta.label}</strong> — set {feeLabel} fees per {meta.classLabel.toLowerCase()}.
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2 }}
        flexWrap="wrap"
        useFlexGap
      >
        <Button
          variant="outlined"
          size="small"
          startIcon={<AutoAwesome />}
          onClick={seedTemplates}
          disabled={seeding}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          {seeding ? "Adding…" : `Add ${meta.label} starter ${meta.classPlural.toLowerCase()}`}
        </Button>
        {meta.gradeSuggestions.slice(0, 4).map((g) => (
          <Chip
            key={g}
            label={g}
            size="small"
            variant="outlined"
            onClick={() => setGradeLevel(g)}
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        sx={{ mb: 3, p: 2, borderRadius: 3, border: 1, borderColor: "divider" }}
        flexWrap="wrap"
      >
        <TextField
          label={`${meta.classLabel} name`}
          size="small"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label={meta.gradeLabel}
          size="small"
          value={gradeLevel}
          onChange={(e) => setGradeLevel(e.target.value)}
          sx={{ minWidth: 110 }}
        />
        {activeLevel === "tertiary" && (
          <>
            <TextField label="Faculty" size="small" value={faculty} onChange={(e) => setFaculty(e.target.value)} sx={{ minWidth: 120 }} />
            <TextField label="Programme" size="small" value={program} onChange={(e) => setProgram(e.target.value)} sx={{ minWidth: 140 }} />
          </>
        )}
        <TextField label={meta.roomLabel} size="small" value={room} onChange={(e) => setRoom(e.target.value)} sx={{ minWidth: 90 }} />
        <TextField label={meta.teacherLabel} size="small" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} sx={{ minWidth: 130 }} />
        <TextField
          label={`Fees per ${feeLabel}`}
          size="small"
          type="number"
          value={feesPerTerm}
          onChange={(e) => setFeesPerTerm(e.target.value)}
          sx={{ minWidth: 130 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">$</InputAdornment>,
            inputProps: { min: 0, step: 0.01 },
          }}
        />
        <Button variant="contained" startIcon={<Add />} onClick={handleSubmit} sx={{ textTransform: "none", fontWeight: 700, alignSelf: "center" }}>
          {editingId ? "Update" : "Add"}
        </Button>
        {editingId && (
          <Button onClick={resetForm} sx={{ textTransform: "none", alignSelf: "center" }}>
            Cancel
          </Button>
        )}
      </Stack>

      <TableContainer sx={{ borderRadius: 3, border: 1, borderColor: "divider" }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>{meta.classLabel}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{meta.gradeLabel}</TableCell>
              {activeLevel === "tertiary" && <TableCell sx={{ fontWeight: 700 }}>Faculty</TableCell>}
              <TableCell sx={{ fontWeight: 700 }}>Fees / {feeLabel}</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>{meta.roomLabel}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {classes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeLevel === "tertiary" ? 6 : 5} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    No {meta.classPlural.toLowerCase()} for {meta.shortLabel} yet. Use starter templates or add manually.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              classes.map((c) => (
                <TableRow key={c._id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {c.name}
                    </Typography>
                    {c.program && (
                      <Typography variant="caption" color="text.secondary">
                        {c.program}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>{c.gradeLevel || "—"}</TableCell>
                  {activeLevel === "tertiary" && <TableCell>{c.faculty || "—"}</TableCell>}
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary.main">
                      {c.feesPerTerm != null ? formatSchoolCurrency(c.feesPerTerm) : "—"}
                    </Typography>
                  </TableCell>
                  <TableCell>{c.room || "—"}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => startEdit(c)}>
                        <EditOutlined fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={async () => {
                          if (!confirm("Delete this class?")) return;
                          await deleteSchoolClass(c._id!);
                          await load();
                        }}
                      >
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

      <Box
        sx={(theme) => ({
          mt: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: alpha(EDUCATION_LEVEL_META[activeLevel].accent, 0.06),
          border: `1px solid ${alpha(EDUCATION_LEVEL_META[activeLevel].accent, 0.2)}`,
        })}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>{meta.label}</strong> uses {meta.feePeriodLabel.toLowerCase()}-based fee tracking. Students enrolled in
          these {meta.classPlural.toLowerCase()} inherit this level automatically.
        </Typography>
      </Box>
    </Box>
  );
}
