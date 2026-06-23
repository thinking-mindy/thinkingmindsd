"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { PersonOutline, SaveOutlined } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth/client";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  type UserProfileData,
} from "@/lib/desktop/user-profile-bridge";
import { offlineAuth } from "@/lib/offline/auth";
import { persistOfflineClientSession } from "@/lib/offline/client-session";
import { memberDisplayName, memberInitial } from "@/lib/member-display";

const ProfileCard = styled(Box)(({ theme }) => ({
  borderRadius: 20,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  padding: theme.spacing(3),
}));

type UserProfileFormProps = {
  title?: string;
  description?: string;
  onMessage?: (message: { type: "success" | "error"; text: string }) => void;
  compact?: boolean;
};

const emptyForm: UserProfileData = {
  id: "",
  email: "",
  firstName: "",
  lastName: "",
  username: "",
  phone: "",
  imageUrl: "",
};

export default function UserProfileForm({
  title = "My profile",
  description = "View and update your account details. Changes are saved on this device and in the local database.",
  onMessage,
  compact = false,
}: UserProfileFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserProfileData>(emptyForm);
  const [error, setError] = useState("");

  const notify = useCallback(
    (message: { type: "success" | "error"; text: string }) => {
      if (onMessage) onMessage(message);
      else if (message.type === "error") setError(message.text);
    },
    [onMessage]
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [serverRes, offlineUser] = await Promise.all([
        getCurrentUserProfile(),
        offlineAuth.getCurrentUser(),
      ]);

      const server = serverRes.success && serverRes.data ? serverRes.data : null;
      const meta = offlineUser?.metadata || {};

      setForm({
        id: server?.id || offlineUser?.id || user?.id || "",
        email: server?.email || offlineUser?.email || "",
        firstName: server?.firstName || offlineUser?.firstName || "",
        lastName: server?.lastName || offlineUser?.lastName || "",
        username: server?.username || offlineUser?.username || "",
        phone: server?.phone || (meta.phone as string) || "",
        imageUrl: server?.imageUrl || (meta.imageUrl as string) || "",
        role: server?.role || (meta.role as string) || (user?.publicMetadata?.role as string),
        companyId:
          server?.companyId ||
          offlineUser?.companyId ||
          (user?.publicMetadata?.companyId as string),
        companyName:
          server?.companyName ||
          (meta.companyName as string) ||
          (user?.publicMetadata?.companyName as string),
      });
    } catch (err) {
      notify({ type: "error", text: (err as Error).message || "Failed to load profile" });
    } finally {
      setLoading(false);
    }
  }, [notify, user?.id, user?.publicMetadata]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadProfile();
  }, [isLoaded, user, loadProfile]);

  const handleChange = (field: keyof UserProfileData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.id) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateCurrentUserProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        username: form.username,
        phone: form.phone,
        imageUrl: form.imageUrl,
      });

      if (!result.success || !result.data) {
        notify({ type: "error", text: result.error || "Failed to save profile" });
        return;
      }

      const offlineUser = await offlineAuth.getCurrentUser();
      if (offlineUser) {
        await offlineAuth.updateUser(form.id, {
          firstName: result.data.firstName,
          lastName: result.data.lastName,
          username: result.data.username || undefined,
          metadata: {
            ...(offlineUser.metadata || {}),
            phone: result.data.phone || undefined,
            imageUrl: result.data.imageUrl || undefined,
            username: result.data.username || undefined,
          },
        });
        const refreshed = await offlineAuth.getCurrentUser();
        if (refreshed) {
          persistOfflineClientSession(refreshed);
        }
      }

      setForm((prev) => ({ ...prev, ...result.data }));
      notify({ type: "success", text: "Profile saved successfully" });
      router.refresh();
    } catch (err) {
      notify({ type: "error", text: (err as Error).message || "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <ProfileCard>
        <Box sx={{ display: "flex", justifyContent: "center", py: compact ? 4 : 8 }}>
          <CircularProgress />
        </Box>
      </ProfileCard>
    );
  }

  if (!user) {
    return (
      <ProfileCard>
        <Alert severity="warning">Sign in to view your profile.</Alert>
      </ProfileCard>
    );
  }

  return (
    <ProfileCard>
      <Stack spacing={3}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
          <Avatar
            src={form.imageUrl || undefined}
            sx={{ width: compact ? 56 : 72, height: compact ? 56 : 72, bgcolor: "primary.main" }}
          >
            {memberInitial(form)}
          </Avatar>
          <Box>
            <Typography variant={compact ? "h6" : "h5"} fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {description}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Signed in as <strong>{memberDisplayName(form)}</strong>
            </Typography>
          </Box>
        </Stack>

        {(error || !onMessage) && error && (
          <Alert severity="error" onClose={() => setError("")}>
            {error}
          </Alert>
        )}

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="First name"
              value={form.firstName}
              onChange={handleChange("firstName")}
              fullWidth
              required
              InputProps={{ startAdornment: <PersonOutline sx={{ mr: 1, color: "text.secondary" }} /> }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Last name"
              value={form.lastName}
              onChange={handleChange("lastName")}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Username"
              value={form.username || ""}
              onChange={handleChange("username")}
              fullWidth
              helperText="Optional — used on the sign-in screen"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Phone"
              value={form.phone || ""}
              onChange={handleChange("phone")}
              fullWidth
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Email" value={form.email} fullWidth disabled helperText="Email cannot be changed here" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField label="Role" value={form.role || "user"} fullWidth disabled />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Company"
              value={form.companyName || "—"}
              fullWidth
              disabled
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Profile image URL"
              value={form.imageUrl || ""}
              onChange={handleChange("imageUrl")}
              fullWidth
              helperText="Optional avatar image link"
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" spacing={1.5}>
          <Button variant="outlined" onClick={loadProfile} disabled={saving} sx={{ textTransform: "none" }}>
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !form.firstName.trim()}
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveOutlined />}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
          >
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </Stack>
      </Stack>
    </ProfileCard>
  );
}
