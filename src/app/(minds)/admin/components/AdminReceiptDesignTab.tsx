"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardContent,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  FormGroup,
  Grid,
  Stack,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { ReceiptLongOutlined, SaveOutlined } from "@mui/icons-material";
import Link from "next/link";
import ReceiptPreview from "@/app/(minds)/pos/components/ReceiptPreview";
import type { Receipt } from "@/app/(minds)/pos/types";
import { getReceiptDesignForCurrentOrg, updateReceiptDesignForCurrentOrg } from "@/lib/desktop/receipt-bridge";
import {
  DEFAULT_RECEIPT_DESIGN_SETTINGS,
  RECEIPT_FEATURE_DEFS,
  RECEIPT_FEATURE_GROUPS,
  mergeReceiptDesignSettings,
  type ReceiptDesignConfig,
  type ReceiptDesignSettings,
} from "@/lib/receipt-settings";

const StyledCard = styled("div")(({ theme }) => ({
  borderRadius: 20,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(8px)",
  height: "100%",
}));

const SAMPLE_RECEIPT: Receipt = {
  id: "POS-2026-00042",
  date: new Date().toISOString(),
  table: "Table 4",
  entries: [
    { item: { id: "1", name: "Espresso", price: 3.5, img: "" }, qty: 2 },
    { item: { id: "2", name: "Croissant", price: 2.25, img: "" }, qty: 1 },
  ],
  subtotal: 9.25,
  tax: 0.49,
  total: 9.74,
  payment: {
    method: "cash",
    paidAmount: 10,
    changeAmount: 0.26,
    reference: "REF-88421",
    paynowNumber: "263771234567",
    cardReference: "AUTH-9921",
  },
};

type AdminReceiptDesignTabProps = {
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export default function AdminReceiptDesignTab({ onMessage }: AdminReceiptDesignTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ReceiptDesignSettings>(DEFAULT_RECEIPT_DESIGN_SETTINGS);
  const [branding, setBranding] = useState<ReceiptDesignConfig["branding"] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getReceiptDesignForCurrentOrg();
      if (data) {
        setSettings(data.settings);
        setBranding(data.branding);
      }
    } catch (error) {
      onMessage({ type: "error", text: "Failed to load receipt design: " + (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewConfig = useMemo<ReceiptDesignConfig>(
    () => ({
      settings,
      branding: branding ?? {
        companyName: "Thinking Minds",
        logoUrl: "/logo.png",
        tagline: "...thinking in terms of lifetimes",
        phone: "",
        footerText: "Thank you!",
      },
    }),
    [settings, branding]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateReceiptDesignForCurrentOrg(mergeReceiptDesignSettings(settings));
      if (!res.success) throw new Error(res.error || "Failed to save");
      if (res.data) {
        setSettings(res.data.settings);
        setBranding(res.data.branding);
      }
      onMessage({ type: "success", text: "Receipt design saved" });
    } catch (error) {
      onMessage({ type: "error", text: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const setAll = (enabled: boolean) => {
    const next = { ...settings };
    for (const def of RECEIPT_FEATURE_DEFS) {
      next[def.key] = enabled;
    }
    setSettings(next);
  };

  const setGroup = (groupId: string, enabled: boolean) => {
    const group = RECEIPT_FEATURE_GROUPS.find((g) => g.id === groupId);
    if (!group) return;
    setSettings((prev) => {
      const next = { ...prev };
      for (const f of group.features) next[f.key] = enabled;
      return next;
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info" sx={{ py: 0.5 }}>
          Logo & company profile:{" "}
          <Link href="/admin" style={{ fontWeight: 600 }}>
            Company
          </Link>
          . Phone, tagline & footer:{" "}
          <Link href="/admin?tab=settings" style={{ fontWeight: 600 }}>
            Settings → Operations
          </Link>
          .
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, lg: 7 }}>
        <StyledCard>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ReceiptLongOutlined color="primary" fontSize="small" />
                <Typography variant="subtitle1" fontWeight={700}>
                  Receipt features
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.75}>
                <Button size="small" variant="text" onClick={() => setAll(true)} sx={{ minWidth: 0, px: 1 }}>
                  All on
                </Button>
                <Button size="small" variant="text" onClick={() => setAll(false)} sx={{ minWidth: 0, px: 1 }}>
                  All off
                </Button>
              </Stack>
            </Stack>

            <Grid container spacing={1.5}>
              {RECEIPT_FEATURE_GROUPS.map((group) => (
                <Grid key={group.id} size={{ xs: 12, sm: 6 }}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1.5,
                      border: (t) => `1px solid ${alpha(t.palette.divider, 0.4)}`,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
                      height: "100%",
                    }}
                  >
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: 0.6, textTransform: "uppercase" }}>
                        {group.title}
                      </Typography>
                      <Stack direction="row" spacing={0}>
                        <Button size="small" variant="text" sx={{ minWidth: 0, px: 0.75, fontSize: "0.7rem" }} onClick={() => setGroup(group.id, true)}>
                          On
                        </Button>
                        <Button size="small" variant="text" sx={{ minWidth: 0, px: 0.75, fontSize: "0.7rem" }} onClick={() => setGroup(group.id, false)}>
                          Off
                        </Button>
                      </Stack>
                    </Stack>
                    <FormGroup sx={{ gap: 0 }}>
                      {group.features.map((feature) => (
                        <FormControlLabel
                          key={feature.key}
                          sx={{
                            m: 0,
                            py: 0,
                            "& .MuiFormControlLabel-label": { fontSize: "0.8125rem", lineHeight: 1.3 },
                          }}
                          control={
                            <Checkbox
                              size="small"
                              checked={settings[feature.key]}
                              onChange={(e) =>
                                setSettings((prev) => ({ ...prev, [feature.key]: e.target.checked }))
                              }
                              sx={{ py: 0.25 }}
                            />
                          }
                          label={feature.label}
                        />
                      ))}
                    </FormGroup>
                  </Box>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
              <Button size="small" variant="outlined" onClick={() => void load()} disabled={saving}>
                Reset
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveOutlined />}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                Save receipt design
              </Button>
            </Box>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <StyledCard>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Live preview
            </Typography>
            <ReceiptPreview receipt={SAMPLE_RECEIPT} design={previewConfig} />
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );
}
