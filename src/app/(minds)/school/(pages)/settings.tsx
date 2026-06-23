"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { Save } from "@mui/icons-material";
import { getSchoolSettings, updateSchoolSettings } from "@/lib/desktop/school-bridge";
import { EDUCATION_LEVEL_META, ALL_EDUCATION_LEVELS } from "@/lib/school-levels";
import { useSchoolLevel } from "../components/SchoolLevelContext";
import type { EducationLevel } from "@/types/school";

export default function SchoolSettingsTab() {
  const { refreshSettings } = useSchoolLevel();
  const [enabledLevels, setEnabledLevels] = useState<EducationLevel[]>(ALL_EDUCATION_LEVELS);
  const [defaultLevel, setDefaultLevel] = useState<EducationLevel>("primary");
  const [institutionName, setInstitutionName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSchoolSettings().then((res) => {
      if (res.success && res.data) {
        setEnabledLevels(res.data.enabledLevels);
        setDefaultLevel(res.data.defaultLevel);
        setInstitutionName(res.data.institutionName ?? "");
      }
    });
  }, []);

  const toggleLevel = (level: EducationLevel) => {
    setEnabledLevels((prev) => {
      const next = prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level];
      if (!next.includes(defaultLevel) && next.length) setDefaultLevel(next[0]);
      return next.length ? next : prev;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    const res = await updateSchoolSettings({ enabledLevels, defaultLevel, institutionName });
    if (res.success) {
      setMessage("Settings saved.");
      await refreshSettings();
    } else {
      setMessage(res.error ?? "Failed to save");
    }
    setSaving(false);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Configure which education levels your institution runs — primary, high school, tertiary, or all three
        on one campus.
      </Typography>

      <Stack spacing={3}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Institution
            </Typography>
            <TextField
              label="Display name (optional)"
              fullWidth
              size="small"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              placeholder="e.g. Thinking Minds Academy"
              helperText="Shown on the school dashboard header"
              sx={{ maxWidth: 420 }}
            />
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Education levels offered
            </Typography>
            <FormGroup>
              {ALL_EDUCATION_LEVELS.map((level) => {
                const meta = EDUCATION_LEVEL_META[level];
                return (
                  <FormControlLabel
                    key={level}
                    control={
                      <Checkbox
                        checked={enabledLevels.includes(level)}
                        onChange={() => toggleLevel(level)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {meta.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {meta.tagline}
                        </Typography>
                      </Box>
                    }
                    sx={{
                      alignItems: "flex-start",
                      mb: 1,
                      p: 1.5,
                      borderRadius: 2,
                      border: 1,
                      borderColor: enabledLevels.includes(level)
                        ? alpha(meta.accent, 0.4)
                        : "divider",
                      bgcolor: enabledLevels.includes(level) ? alpha(meta.accent, 0.06) : "transparent",
                    }}
                  />
                );
              })}
            </FormGroup>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={800} gutterBottom>
              Default level
            </Typography>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>When adding records</InputLabel>
              <Select
                label="When adding records"
                value={defaultLevel}
                onChange={(e) => setDefaultLevel(e.target.value as EducationLevel)}
              >
                {enabledLevels.map((level) => (
                  <MenuItem key={level} value={level}>
                    {EDUCATION_LEVEL_META[level].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving || enabledLevels.length === 0}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            {saving ? "Saving…" : "Save settings"}
          </Button>
          {message && (
            <Typography variant="body2" color={message.includes("saved") ? "success.main" : "error.main"}>
              {message}
            </Typography>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
