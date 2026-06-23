"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { EducationLevelMeta } from "@/lib/school-levels";
import type { SchoolClass, SchoolStudent, StudentStatus } from "@/types/school";

export type StudentFormState = {
  firstName: string;
  lastName: string;
  classId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  dateOfBirth: string;
  gender: "" | "male" | "female" | "other";
  status: StudentStatus;
  notes: string;
};

const emptyForm = (): StudentFormState => ({
  firstName: "",
  lastName: "",
  classId: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  dateOfBirth: "",
  gender: "",
  status: "active",
  notes: "",
});

export default function StudentDialog({
  open,
  onClose,
  onSave,
  classes,
  student,
  loading,
  levelMeta,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (form: StudentFormState) => Promise<void>;
  classes: SchoolClass[];
  student?: SchoolStudent | null;
  loading?: boolean;
  levelMeta: EducationLevelMeta;
}) {
  const [form, setForm] = useState<StudentFormState>(emptyForm());

  useEffect(() => {
    if (!open) return;
    if (student) {
      setForm({
        firstName: student.firstName,
        lastName: student.lastName,
        classId: student.classId ?? "",
        guardianName: student.guardianName ?? "",
        guardianPhone: student.guardianPhone ?? "",
        guardianEmail: student.guardianEmail ?? "",
        dateOfBirth: student.dateOfBirth ?? "",
        gender: student.gender ?? "",
        status: student.status,
        notes: student.notes ?? "",
      });
    } else {
      setForm(emptyForm());
    }
  }, [open, student]);

  const patch = (p: Partial<StudentFormState>) => setForm((f) => ({ ...f, ...p }));
  const canSave = form.firstName.trim() && form.lastName.trim();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {student ? `Edit ${levelMeta.studentLabel.toLowerCase()}` : `Enrol ${levelMeta.studentLabel.toLowerCase()}`}
        {student?.studentNumber && (
          <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
            {student.studentNumber}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="First name"
              fullWidth
              required
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
            />
            <TextField
              label="Last name"
              fullWidth
              required
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
            />
          </Stack>
          <FormControl fullWidth size="small">
            <InputLabel>{levelMeta.classLabel}</InputLabel>
            <Select label={levelMeta.classLabel} value={form.classId} onChange={(e) => patch({ classId: e.target.value })}>
              <MenuItem value="">None</MenuItem>
              {classes.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label={`${levelMeta.guardianLabel} name`}
              fullWidth
              value={form.guardianName}
              onChange={(e) => patch({ guardianName: e.target.value })}
            />
            <TextField
              label={`${levelMeta.guardianLabel} phone`}
              fullWidth
              value={form.guardianPhone}
              onChange={(e) => patch({ guardianPhone: e.target.value })}
            />
          </Stack>
          <TextField
            label={`${levelMeta.guardianLabel} email`}
            fullWidth
            type="email"
            value={form.guardianEmail}
            onChange={(e) => patch({ guardianEmail: e.target.value })}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Date of birth"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.dateOfBirth}
              onChange={(e) => patch({ dateOfBirth: e.target.value })}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Gender</InputLabel>
              <Select label="Gender" value={form.gender} onChange={(e) => patch({ gender: e.target.value as StudentFormState["gender"] })}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select label="Status" value={form.status} onChange={(e) => patch({ status: e.target.value as StudentStatus })}>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="graduated">Graduated</MenuItem>
                <MenuItem value="withdrawn">Withdrawn</MenuItem>
              </Select>
            </FormControl>
          </Stack>
          <TextField
            label="Notes"
            fullWidth
            multiline
            minRows={2}
            value={form.notes}
            onChange={(e) => patch({ notes: e.target.value })}
          />
          {!student && (
            <Typography
              variant="caption"
              sx={(theme) => ({
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                color: "text.secondary",
              })}
            >
              A unique student number (e.g. ST254319S) will be generated automatically on save.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={!canSave || loading}
          onClick={() => onSave(form)}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          {loading ? "Saving…" : student ? "Update" : "Add student"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
