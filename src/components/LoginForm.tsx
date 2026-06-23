"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
  Divider,
  Stack,
  Autocomplete,
  Avatar,
  Chip,
  IconButton,
  Collapse,
  alpha,
  Fade,
  Skeleton,
  InputAdornment,
} from "@mui/material";
import {
  ArrowBack,
  LoginOutlined,
  PersonAddOutlined,
  LockOutlined,
  BusinessOutlined,
  ArrowForward,
} from "@mui/icons-material";
import { OfflineUser, getRecentUserIds, recordRecentUser, avatarColorFromId } from "@/lib/offline/auth";
import {
  authenticate as authLogin,
  getCurrentUser,
  listCompaniesForRegister,
  listPublicProfiles,
  registerJoin,
  registerOwner,
  type PublicProfile,
} from "@/lib/desktop/auth-bridge";
import { isTauriBackendAvailable } from "@/lib/desktop/runtime";
import { useRouter } from "next/navigation";
import {
  OFFLINE_AUTH_CHANGED_EVENT,
  persistOfflineClientSession,
} from "@/lib/offline/client-session";
import { syncLocalOrgToDatabaseBridge } from "@/lib/desktop/orgs-bridge";
import { createJoinRequest } from "@/lib/desktop/join-requests-bridge";

type LoginView = "welcome" | "password" | "manual" | "register";

type CompanyOption = { id: string; name: string; createdByUserId: string };

function sortProfiles(profiles: PublicProfile[], recentIds: string[]): PublicProfile[] {
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...profiles].sort((a, b) => {
    const aRank = rank.has(a.id) ? rank.get(a.id)! : 999;
    const bRank = rank.has(b.id) ? rank.get(b.id)! : 999;
    if (aRank !== bRank) return aRank - bRank;
    return a.displayName.localeCompare(b.displayName);
  });
}

function profileBadge(profile: PublicProfile, activeSessionUserId: string | null): string | undefined {
  if (profile.id === activeSessionUserId) return "Last active";
  if (profile.id === getRecentUserIds()[0] && profile.id !== activeSessionUserId) return "Recent";
  return undefined;
}

function ProfileTile({
  profile,
  onClick,
  badge,
  compact,
}: {
  profile: PublicProfile;
  onClick: () => void;
  badge?: string;
  compact?: boolean;
}) {
  const color = avatarColorFromId(profile.id);
  const size = compact ? 56 : 72;

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={(theme) => ({
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1.25,
        p: compact ? 1.5 : 2,
        width: "100%",
        border: "none",
        borderRadius: 3,
        cursor: "pointer",
        bgcolor: "transparent",
        transition: "transform 0.22s ease, background-color 0.22s ease",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          transform: "translateY(-3px)",
          "& .profile-avatar": {
            boxShadow: `0 12px 32px ${alpha(color, 0.45)}`,
            transform: "scale(1.04)",
          },
        },
        "&:focus-visible": {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      })}
    >
      <Box sx={{ position: "relative" }}>
        <Avatar
          className="profile-avatar"
          sx={{
            width: size,
            height: size,
            fontSize: compact ? "1rem" : "1.35rem",
            fontWeight: 800,
            bgcolor: color,
            border: "3px solid",
            borderColor: "background.paper",
            boxShadow: (t) => `0 8px 24px ${alpha(color, 0.3)}`,
            transition: "transform 0.22s ease, box-shadow 0.22s ease",
          }}
        >
          {profile.initials}
        </Avatar>
        {badge && (
          <Chip
            label={badge}
            size="small"
            color="primary"
            sx={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              height: 20,
              fontSize: "0.62rem",
              fontWeight: 700,
              "& .MuiChip-label": { px: 0.75 },
            }}
          />
        )}
      </Box>
      <Box sx={{ textAlign: "center", minWidth: 0, width: "100%" }}>
        <Typography variant="subtitle2" fontWeight={700} noWrap>
          {profile.displayName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {profile.username ? `@${profile.username}` : profile.email}
        </Typography>
        {profile.companyName && (
          <Chip
            icon={<BusinessOutlined sx={{ fontSize: "0.85rem !important" }} />}
            label={profile.companyName}
            size="small"
            variant="outlined"
            sx={{
              mt: 0.75,
              maxWidth: "100%",
              height: 24,
              fontSize: "0.68rem",
              "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" },
            }}
          />
        )}
      </Box>
    </Box>
  );
}

function ProfileListRow({
  profile,
  onClick,
  badge,
}: {
  profile: PublicProfile;
  onClick: () => void;
  badge?: string;
}) {
  const color = avatarColorFromId(profile.id);
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        width: "100%",
        p: 1.25,
        textAlign: "left",
        border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        borderRadius: 2.5,
        cursor: "pointer",
        bgcolor: alpha(theme.palette.background.paper, 0.6),
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: theme.palette.primary.main,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          "& .row-arrow": { opacity: 1, transform: "translateX(2px)" },
        },
      })}
    >
      <Avatar sx={{ bgcolor: color, width: 40, height: 40, fontWeight: 700 }}>
        {profile.initials}
      </Avatar>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Typography variant="body2" fontWeight={700} noWrap>
            {profile.displayName}
          </Typography>
          {badge && (
            <Chip label={badge} size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.62rem" }} />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap display="block">
          {profile.companyName || profile.username || profile.email}
        </Typography>
      </Box>
      <ArrowForward className="row-arrow" sx={{ fontSize: 18, color: "text.secondary", opacity: 0.5, transition: "all 0.2s ease" }} />
    </Box>
  );
}

function ProfileSkeletonGrid() {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        gap: 1.5,
      }}
    >
      {[0, 1, 2].map((i) => (
        <Stack key={i} alignItems="center" spacing={1}>
          <Skeleton variant="circular" width={72} height={72} />
          <Skeleton variant="text" width={80} />
          <Skeleton variant="rounded" width={64} height={22} />
        </Stack>
      ))}
    </Box>
  );
}

function WelcomeFallbackActions({
  onManual,
  onRegister,
}: {
  onManual: () => void;
  onRegister: () => void;
}) {
  return (
    <Stack spacing={1}>
      <Button
        variant="contained"
        fullWidth
        startIcon={<PersonAddOutlined />}
        onClick={onRegister}
        sx={{ borderRadius: 2.5, py: 1.25, fontWeight: 700 }}
      >
        Log in with a new user
      </Button>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<LoginOutlined />}
        onClick={onManual}
        sx={{
          borderRadius: 2.5,
          py: 1.2,
          fontWeight: 600,
          borderWidth: 1.5,
          "&:hover": { borderWidth: 1.5 },
        }}
      >
        Sign in with email or username
      </Button>
    </Stack>
  );
}

export default function LoginForm({
  initialMode = "login",
  registerOnly = false,
}: {
  initialMode?: "login" | "register";
  registerOnly?: boolean;
}) {
  const [view, setView] = useState<LoginView>(registerOnly || initialMode === "register" ? "register" : "welcome");
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [activeSessionUserId, setActiveSessionUserId] = useState<string | null>(null);
  const [registerMode, setRegisterMode] = useState<"create" | "join">("create");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(null);
  const [hasCompanies, setHasCompanies] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const sortedProfiles = useMemo(
    () => sortProfiles(profiles, getRecentUserIds()),
    [profiles]
  );

  const useTileGrid = sortedProfiles.length <= 4;

  const loadCompanies = useCallback(async () => {
    try {
      const companies = await listCompaniesForRegister();
      setCompanyOptions(companies);
      setHasCompanies(companies.length > 0);
    } catch {
      setCompanyOptions([]);
      setHasCompanies(false);
    }
  }, []);

  const loadProfiles = useCallback(async () => {
    try {
      const [listed, sessionUser] = await Promise.all([
        listPublicProfiles(),
        getCurrentUser(),
      ]);
      setProfiles(listed);
      setActiveSessionUserId(sessionUser?.id ?? null);

      if (registerOnly) {
        setView("register");
        setRegisterMode("create");
        await loadCompanies();
      } else if (listed.length === 0) {
        setView("welcome");
      } else if (initialMode === "login") {
        setView("welcome");
      }
    } catch {
      setProfiles([]);
      setActiveSessionUserId(null);
      if (!registerOnly) setView("welcome");
    } finally {
      setBootstrapping(false);
    }
  }, [initialMode, registerOnly, loadCompanies]);

  useEffect(() => {
    const failsafe = setTimeout(() => setBootstrapping(false), 6000);
    loadProfiles().finally(() => clearTimeout(failsafe));
    return () => clearTimeout(failsafe);
  }, [loadProfiles]);

  useEffect(() => {
    const refresh = () => {
      loadProfiles();
    };
    window.addEventListener(OFFLINE_AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_AUTH_CHANGED_EVENT, refresh);
  }, [loadProfiles]);

  const persistSession = (user: OfflineUser) => {
    recordRecentUser(user.id);
    persistOfflineClientSession(user);
  };

  const syncPendingJoinRequest = async (user: OfflineUser) => {
    if (isTauriBackendAvailable()) return;

    const role = user.metadata?.role as string | undefined;
    const pendingCompanyId = user.metadata?.pendingCompanyId as string | undefined;
    if (role !== "pending" || !pendingCompanyId) return;

    const { getOfflineCompanies } = await import("@/lib/offline/company");
    const companies = await getOfflineCompanies();
    const company = companies.find((c) => c.id === pendingCompanyId);
    const displayName =
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
    const pendingName = user.metadata?.pendingCompanyName as string | undefined;

    await createJoinRequest(pendingCompanyId, user.email, displayName, {
      companyName: pendingName || company?.name,
      ownerId: company?.createdByUserId,
    });
  };

  const completeLogin = async (identifier: string, pwd: string) => {
    const user = await authLogin(identifier, pwd);
    if (!user) {
      setError("Incorrect password. Try again.");
      return false;
    }
    persistSession(user);
    await syncPendingJoinRequest(user);
    router.push("/dashboard");
    return true;
  };

  const handleProfilePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    setError("");
    setLoading(true);
    try {
      await completeLogin(selectedProfile.loginIdentifier, password);
    } catch (err) {
      setError("Login failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await completeLogin(email, password);
    } catch (err) {
      setError("Login failed: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      let current: OfflineUser | null = null;

      if (registerMode === "create") {
        if (!companyName.trim()) {
          setError("Company name is required");
          setLoading(false);
          return;
        }
        current = await registerOwner({
          email,
          password,
          username: username.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          companyName: companyName.trim(),
        });
      } else {
        if (!selectedCompany) {
          setError("Select a company to join");
          setLoading(false);
          return;
        }
        current = await registerJoin({
          email,
          password,
          username: username.trim() || undefined,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
          ownerId: selectedCompany.createdByUserId,
        });
      }

      if (current) {
        persistSession(current);
        if (!isTauriBackendAvailable()) {
          if (registerMode === "create") {
            const companyId =
              current.companyId ||
              (current.metadata?.companyId as string | undefined);
            const syncedName =
              (current.metadata?.companyName as string | undefined) || companyName.trim();
            if (companyId) {
              await syncLocalOrgToDatabaseBridge({
                companyId,
                companyName: syncedName,
                email: current.email,
              });
            }
          } else if (registerMode === "join" && selectedCompany) {
            const displayName =
              `${current.firstName || ""} ${current.lastName || ""}`.trim() || current.email;
            const joinRes = await createJoinRequest(
              selectedCompany.id,
              current.email,
              displayName,
              {
                companyName: selectedCompany.name,
                ownerId: selectedCompany.createdByUserId,
              }
            );
            if (!joinRes.success) {
              setError(joinRes.error || "Failed to save join request to local database");
              setLoading(false);
              return;
            }
          }
        }
      }
      setSuccess("Account created successfully.");
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const pickProfile = (profile: PublicProfile) => {
    setSelectedProfile(profile);
    setPassword("");
    setError("");
    setView("password");
  };

  const goWelcome = () => {
    setSelectedProfile(null);
    setPassword("");
    setError("");
    setView("welcome");
  };

  const goManual = () => {
    setEmail("");
    setPassword("");
    setError("");
    setView("manual");
  };

  const goRegister = () => {
    setError("");
    setSuccess("");
    setBootstrapping(false);
    setView("register");
    void loadCompanies();
  };

  const goManualLogin = () => {
    setBootstrapping(false);
    goManual();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ borderRadius: 2 }}>
          {success}
        </Alert>
      )}

      <Collapse in={view === "welcome"} unmountOnExit>
        <Fade in={view === "welcome"} timeout={400}>
          <Stack spacing={2.5}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {bootstrapping
                ? "Loading saved profiles…"
                : sortedProfiles.length
                  ? "Select your profile — password only when you continue."
                  : "No saved profiles on this device yet."}
            </Typography>

            {bootstrapping ? (
              <ProfileSkeletonGrid />
            ) : sortedProfiles.length > 0 ? (
              useTileGrid ? (
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: sortedProfiles.length === 1 ? "1fr" : "repeat(2, 1fr)",
                      sm: `repeat(${Math.min(sortedProfiles.length, 3)}, 1fr)`,
                    },
                    gap: { xs: 1, sm: 1.5 },
                    justifyItems: "center",
                    py: 1,
                  }}
                >
                  {sortedProfiles.map((profile) => (
                    <ProfileTile
                      key={profile.id}
                      profile={profile}
                      onClick={() => pickProfile(profile)}
                      badge={profileBadge(profile, activeSessionUserId)}
                      compact={sortedProfiles.length > 2}
                    />
                  ))}
                </Box>
              ) : (
                <Stack spacing={1}>
                  {sortedProfiles.map((profile) => (
                    <ProfileListRow
                      key={profile.id}
                      profile={profile}
                      onClick={() => pickProfile(profile)}
                      badge={profileBadge(profile, activeSessionUserId)}
                    />
                  ))}
                </Stack>
              )
            ) : null}

            {sortedProfiles.length > 0 && !bootstrapping ? (
              <Divider sx={{ "&::before, &::after": { borderColor: (t) => alpha(t.palette.divider, 0.6) } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  or
                </Typography>
              </Divider>
            ) : null}

            <WelcomeFallbackActions onManual={goManualLogin} onRegister={goRegister} />
          </Stack>
        </Fade>
      </Collapse>

      <Collapse in={view === "password" && !!selectedProfile} unmountOnExit>
        {selectedProfile && (
          <Box component="form" onSubmit={handleProfilePassword}>
            <Stack spacing={2.5} alignItems="center">
              <IconButton
                onClick={goWelcome}
                size="small"
                sx={{
                  alignSelf: "flex-start",
                  bgcolor: (t) => alpha(t.palette.action.hover, 0.08),
                  "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.1) },
                }}
                aria-label="Back to profiles"
              >
                <ArrowBack fontSize="small" />
              </IconButton>

              <Avatar
                sx={{
                  width: 88,
                  height: 88,
                  fontSize: "1.75rem",
                  fontWeight: 800,
                  bgcolor: avatarColorFromId(selectedProfile.id),
                  boxShadow: (t) =>
                    `0 16px 40px ${alpha(avatarColorFromId(selectedProfile.id), 0.38)}`,
                }}
              >
                {selectedProfile.initials}
              </Avatar>

              <Box textAlign="center">
                <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
                  {selectedProfile.displayName}
                </Typography>
                {selectedProfile.companyName && (
                  <Typography variant="body2" color="primary" fontWeight={600} sx={{ mt: 0.25 }}>
                    {selectedProfile.companyName}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Enter your password to unlock your workspace
                </Typography>
              </Box>

              <TextField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                autoFocus
                autoComplete="current-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
              />

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || !password}
                endIcon={!loading ? <ArrowForward /> : undefined}
                sx={{
                  borderRadius: 2.5,
                  py: 1.35,
                  fontWeight: 700,
                  boxShadow: (t) => `0 8px 24px ${alpha(t.palette.primary.main, 0.35)}`,
                }}
              >
                {loading ? "Signing in…" : "Continue"}
              </Button>

              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={goWelcome}
                sx={{ cursor: "pointer", fontWeight: 500 }}
              >
                Not you? Switch profile
              </Link>
            </Stack>
          </Box>
        )}
      </Collapse>

      <Collapse in={view === "manual"} unmountOnExit>
        <Box component="form" onSubmit={handleManualLogin}>
          <Stack spacing={2}>
            {profiles.length > 0 && (
              <IconButton
                onClick={goWelcome}
                size="small"
                sx={{ alignSelf: "flex-start" }}
                aria-label="Back"
              >
                <ArrowBack fontSize="small" />
              </IconButton>
            )}
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
                Sign in manually
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Use your username or email if your profile isn&apos;t listed.
              </Typography>
            </Box>

            <TextField
              label="Username or email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="username"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="current-password"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
            {!registerOnly && (
              <Typography variant="body2" textAlign="center" color="text.secondary">
                New here?{" "}
                <Link component="button" type="button" onClick={goRegister} sx={{ cursor: "pointer", fontWeight: 600 }}>
                  Create an account
                </Link>
              </Typography>
            )}
          </Stack>
        </Box>
      </Collapse>

      <Collapse in={view === "register"} unmountOnExit>
        <Box component="form" onSubmit={handleRegister}>
          <Stack spacing={2}>
            {!registerOnly && profiles.length > 0 && (
              <IconButton onClick={goWelcome} size="small" sx={{ alignSelf: "flex-start" }} aria-label="Back">
                <ArrowBack fontSize="small" />
              </IconButton>
            )}
            <Box>
              <Typography variant="h6" fontWeight={800} letterSpacing="-0.02em">
                Create account
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Set up a local account and create or join a company.
              </Typography>
            </Box>

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                Account setup
              </Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  variant={registerMode === "create" ? "contained" : "outlined"}
                  onClick={() => setRegisterMode("create")}
                  type="button"
                  sx={{ borderRadius: 2, flex: 1, fontWeight: 600 }}
                >
                  Create company
                </Button>
                <Button
                  variant={registerMode === "join" ? "contained" : "outlined"}
                  onClick={() => setRegisterMode("join")}
                  disabled={!hasCompanies || registerOnly}
                  type="button"
                  sx={{ borderRadius: 2, flex: 1, fontWeight: 600 }}
                >
                  Join company
                </Button>
              </Stack>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
              />
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
              />
            </Stack>

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              fullWidth
              autoComplete="username"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              autoComplete="new-password"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
            />

            {registerMode === "create" ? (
              <TextField
                label="Company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                fullWidth
                helperText="Creates your organisation and company ID"
                required
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2.5 } }}
              />
            ) : (
              <Autocomplete
                options={companyOptions}
                value={selectedCompany}
                onChange={(_, value) => setSelectedCompany(value)}
                getOptionLabel={(option) => `${option.name} (${option.id})`}
                renderInput={(params) => <TextField {...params} label="Select company to join" required />}
              />
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{ borderRadius: 2.5, py: 1.2, fontWeight: 700 }}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>

            {!registerOnly && profiles.length > 0 && (
              <Typography variant="body2" textAlign="center" color="text.secondary">
                Already have an account?{" "}
                <Link component="button" type="button" onClick={goWelcome} sx={{ cursor: "pointer", fontWeight: 600 }}>
                  Pick your profile
                </Link>
              </Typography>
            )}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  );
}
