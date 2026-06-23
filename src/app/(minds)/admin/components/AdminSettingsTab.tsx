"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import {
  AttachMoneyOutlined,
  ContentCopyOutlined,
  Email as EmailIcon,
  LanguageOutlined,
  NotificationsActive,
  PaletteOutlined,
  ReceiptLongOutlined,
  Sms,
  StorageOutlined,
  WarningAmberOutlined,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import Link from "next/link";
import { getOrgBridge } from "@/lib/desktop/orgs-bridge";
import { updateOrgBridge } from "@/lib/desktop/admin-bridge";
import { getFinanceSettings, updateFinanceSettings } from "@/lib/desktop/finance-bridge";
import { DEFAULT_FINANCE_SETTINGS } from "@/lib/finance-shared";
import { applyOrgThemePrefs, saveOrgThemePrefs } from "@/lib/org-theme-prefs";
import type { Org } from "@/types/database";

const StyledCard = styled("div")(({ theme }) => ({
  borderRadius: 20,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(8px)",
  height: "100%",
}));

const TIMEZONES = [
  { value: "Africa/Harare", label: "Harare (CAT)" },
  { value: "Africa/Johannesburg", label: "Johannesburg (SAST)" },
  { value: "Africa/Lagos", label: "Lagos (WAT)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
];

const DATE_FORMATS = [
  { value: "mdy", label: "MM/DD/YYYY" },
  { value: "dmy", label: "DD/MM/YYYY" },
  { value: "ymd", label: "YYYY-MM-DD" },
] as const;

const CURRENCIES = ["USD", "ZWL", "ZAR", "EUR", "GBP"];

type AdminSettingsTabProps = {
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export default function AdminSettingsTab({ onMessage }: AdminSettingsTabProps) {
  const { user } = useUser();
  const companyId = user?.publicMetadata?.companyId as string | undefined;

  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [timezone, setTimezone] = useState("Africa/Harare");
  const [dateFormat, setDateFormat] = useState<"mdy" | "dmy" | "ymd">("dmy");
  const [defaultCurrency, setDefaultCurrency] = useState("USD");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [receiptFooter, setReceiptFooter] = useState("");
  const [receiptPhone, setReceiptPhone] = useState("");
  const [receiptTagline, setReceiptTagline] = useState("...thinking in terms of lifetimes");

  const [darkMode, setDarkMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0AA775");

  const loadSettings = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [orgRes, financeRes] = await Promise.all([
        getOrgBridge(companyId),
        getFinanceSettings(companyId),
      ]);

      if (orgRes.success && orgRes.data) {
        const org = orgRes.data as unknown as Org;
        const os = org.orgSettings ?? {};
        setTimezone(os.timezone ?? "Africa/Harare");
        setDateFormat(os.dateFormat ?? "dmy");
        setLowStockAlerts(os.lowStockAlerts !== false);
        setReceiptFooter(os.receiptFooter ?? "");
        setReceiptPhone(os.phone ?? "");
        setReceiptTagline(os.tagline ?? "...thinking in terms of lifetimes");

        const ns = org.notificationSettings ?? {};
        setEmailNotifications(ns.email !== false);
        setSmsNotifications(ns.sms === true);
        setPushNotifications(ns.push !== false);

        const ts = org.themeSettings ?? {};
        setDarkMode(ts.darkMode === true);
        setPrimaryColor(ts.primaryColor ?? "#0AA775");
        applyOrgThemePrefs(ts);
      }

      if (financeRes.success && financeRes.data?.defaultCurrency) {
        setDefaultCurrency(financeRes.data.defaultCurrency);
      }
    } catch (error) {
      onMessage({ type: "error", text: "Failed to load settings: " + (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const withSave = async (section: string, fn: () => Promise<void>) => {
    if (!companyId) {
      onMessage({ type: "error", text: "Company ID not found" });
      return;
    }
    setSavingSection(section);
    try {
      await fn();
      onMessage({ type: "success", text: `${section} saved` });
      await loadSettings();
    } catch (error) {
      onMessage({ type: "error", text: (error as Error).message });
    } finally {
      setSavingSection(null);
    }
  };

  const saveGeneral = () =>
    withSave("General settings", async () => {
      const finance = await getFinanceSettings(companyId!);
      const base = finance.data ?? DEFAULT_FINANCE_SETTINGS;
      const financeRes = await updateFinanceSettings(companyId!, {
        ...base,
        defaultCurrency,
      });
      if (!financeRes.success) throw new Error(financeRes.error || "Failed to save currency");

      const orgRes = await getOrgBridge(companyId!);
      const existing = (orgRes.data as Org | null)?.orgSettings ?? {};
      const updateRes = await updateOrgBridge(companyId!, {
        orgSettings: { ...existing, timezone, dateFormat },
      });
      if (!updateRes.success) throw new Error(updateRes.error || "Failed to save organisation settings");
    });

  const saveNotifications = () =>
    withSave("Notification settings", async () => {
      const res = await updateOrgBridge(companyId!, {
        notificationSettings: {
          email: emailNotifications,
          sms: smsNotifications,
          push: pushNotifications,
        },
      });
      if (!res.success) throw new Error(res.error || "Failed to save notifications");
    });

  const saveOperations = () =>
    withSave("Operations settings", async () => {
      const orgRes = await getOrgBridge(companyId!);
      const existing = (orgRes.data as Org | null)?.orgSettings ?? {};
      const res = await updateOrgBridge(companyId!, {
        orgSettings: {
          ...existing,
          timezone,
          dateFormat,
          lowStockAlerts,
          receiptFooter,
          phone: receiptPhone,
          tagline: receiptTagline,
        },
      });
      if (!res.success) throw new Error(res.error || "Failed to save operations settings");
    });

  const saveTheme = () =>
    withSave("Theme settings", async () => {
      const res = await updateOrgBridge(companyId!, {
        themeSettings: { darkMode, primaryColor },
      });
      if (!res.success) throw new Error(res.error || "Failed to save theme");
      saveOrgThemePrefs({ darkMode, primaryColor });
    });

  const copyOrgId = async () => {
    if (!companyId) return;
    try {
      await navigator.clipboard.writeText(companyId);
      onMessage({ type: "success", text: "Organisation ID copied" });
    } catch {
      onMessage({ type: "error", text: "Could not copy to clipboard" });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const settingRowSx = {
    p: 2,
    borderRadius: 2,
    border: (t: { palette: { divider: string } }) => `1px solid ${alpha(t.palette.divider, 0.5)}`,
  } as const;

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Alert severity="info" icon={<StorageOutlined />}>
          Settings are saved per organisation and apply to all members. Finance cashier categories are configured in{" "}
          <Link href="/finance" style={{ fontWeight: 600 }}>
            Finance → Configuration
          </Link>
          .
        </Alert>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <LanguageOutlined color="primary" />
              <Typography variant="h6" fontWeight={700}>
                General
              </Typography>
            </Stack>
            <Stack spacing={2.5}>
              <Box sx={settingRowSx}>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Organisation ID
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="body2" fontFamily="monospace" sx={{ flex: 1, wordBreak: "break-all" }}>
                    {companyId ?? "—"}
                  </Typography>
                  <Button size="small" startIcon={<ContentCopyOutlined />} onClick={copyOrgId} disabled={!companyId}>
                    Copy
                  </Button>
                </Stack>
              </Box>

              <FormControl fullWidth size="small">
                <InputLabel>Timezone</InputLabel>
                <Select label="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                  {TIMEZONES.map((tz) => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Date format</InputLabel>
                <Select
                  label="Date format"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}
                >
                  {DATE_FORMATS.map((f) => (
                    <MenuItem key={f.value} value={f.value}>
                      {f.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Default currency</InputLabel>
                <Select
                  label="Default currency"
                  value={defaultCurrency}
                  onChange={(e) => setDefaultCurrency(e.target.value)}
                >
                  {CURRENCIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, pt: 1 }}>
                <Button variant="outlined" onClick={() => void loadSettings()} disabled={!!savingSection}>
                  Reset
                </Button>
                <Button
                  variant="contained"
                  onClick={() => void saveGeneral()}
                  disabled={!!savingSection}
                  startIcon={savingSection === "General settings" ? <CircularProgress size={18} color="inherit" /> : <AttachMoneyOutlined />}
                >
                  Save general
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 3 }}>
              Notification preferences
            </Typography>
            <Stack spacing={2}>
              {[
                {
                  icon: <EmailIcon sx={{ color: "primary.main" }} />,
                  label: "Email notifications",
                  hint: "Billing, join requests, and system alerts",
                  checked: emailNotifications,
                  onChange: setEmailNotifications,
                },
                {
                  icon: <Sms sx={{ color: "primary.main" }} />,
                  label: "SMS notifications",
                  hint: "Payment confirmations and urgent alerts",
                  checked: smsNotifications,
                  onChange: setSmsNotifications,
                },
                {
                  icon: <NotificationsActive sx={{ color: "primary.main" }} />,
                  label: "Push notifications",
                  hint: "In-browser alerts while using the app",
                  checked: pushNotifications,
                  onChange: setPushNotifications,
                },
              ].map((row) => (
                <Box key={row.label} sx={{ ...settingRowSx, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    {row.icon}
                    <Box>
                      <Typography variant="subtitle2" fontWeight={600}>
                        {row.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {row.hint}
                      </Typography>
                    </Box>
                  </Box>
                  <Switch checked={row.checked} onChange={(e) => row.onChange(e.target.checked)} />
                </Box>
              ))}
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, pt: 1 }}>
                <Button
                  variant="contained"
                  onClick={() => void saveNotifications()}
                  disabled={!!savingSection}
                >
                  {savingSection === "Notification settings" ? <CircularProgress size={20} /> : "Save notifications"}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <WarningAmberOutlined color="warning" />
              <Typography variant="h6" fontWeight={700}>
                Operations
              </Typography>
            </Stack>
            <Stack spacing={2.5}>
              <Box sx={{ ...settingRowSx, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={600}>
                    Low stock alerts
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Highlight reorder levels on the inventory dashboard
                  </Typography>
                </Box>
                <Switch checked={lowStockAlerts} onChange={(e) => setLowStockAlerts(e.target.checked)} />
              </Box>

              <TextField
                label="Receipt phone number"
                placeholder="+1 555 0100"
                value={receiptPhone}
                onChange={(e) => setReceiptPhone(e.target.value)}
                fullWidth
                helperText="Shown on POS receipts when the phone line is enabled"
              />

              <TextField
                label="Receipt tagline"
                placeholder="...thinking in terms of lifetimes"
                value={receiptTagline}
                onChange={(e) => setReceiptTagline(e.target.value)}
                fullWidth
                helperText="Short line under your company name on receipts"
              />

              <TextField
                label="Receipt footer text"
                placeholder="Thank you for your business!"
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                InputProps={{
                  startAdornment: <ReceiptLongOutlined sx={{ color: "text.secondary", mr: 1, alignSelf: "flex-start", mt: 1 }} />,
                }}
                helperText="Shown on POS receipts and printed invoices"
              />

              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" onClick={() => void saveOperations()} disabled={!!savingSection}>
                  {savingSection === "Operations settings" ? <CircularProgress size={20} /> : "Save operations"}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <StyledCard>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
              <PaletteOutlined color="primary" />
              <Typography variant="h6" fontWeight={700}>
                Appearance
              </Typography>
            </Stack>
            <Stack spacing={2.5}>
              <FormControlLabel
                control={<Switch checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />}
                label="Prefer dark mode (saved for this organisation)"
              />
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Brand primary colour
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    sx={{ width: 72 }}
                  />
                  <TextField
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    size="small"
                    sx={{ flex: 1, fontFamily: "monospace" }}
                  />
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      bgcolor: primaryColor,
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  />
                </Stack>
              </Box>
              <Divider />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button variant="contained" fullWidth onClick={() => void saveTheme()} disabled={!!savingSection}>
                  {savingSection === "Theme settings" ? <CircularProgress size={20} /> : "Save appearance"}
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </StyledCard>
      </Grid>
    </Grid>
  );
}
