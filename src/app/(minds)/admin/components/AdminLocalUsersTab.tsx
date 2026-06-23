"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import {
  BusinessOutlined,
  DeleteOutline,
  RefreshOutlined,
  StorageOutlined,
  DevicesOutlined,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import {
  deleteLocalAppCompanyBridge,
  deleteLocalAppUserBridge,
  listLocalAppCompaniesBridge,
  listLocalAppUsersBridge,
} from "@/lib/desktop/admin-bridge";
import { offlineAuth } from "@/lib/offline/auth";
import { isTauriBackendAvailable } from "@/lib/desktop/runtime";
import { tauriAuthDeleteOfflineUser, tauriAuthListOfflineUsers } from "@/lib/desktop/auth";
import {
  deleteOfflineCompany,
  deleteOfflineJoinRequestsForUser,
  getOfflineCompanies,
  type OfflineCompany,
} from "@/lib/offline/company";
import { memberDisplayName, memberInitial } from "@/lib/member-display";
import UserProfileForm from "@/components/UserProfileForm";

const StyledCard = styled("div")(({ theme }) => ({
  borderRadius: 20,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(8px)",
}));

const RowCard = styled(Box)(({ theme }) => ({
  borderRadius: 14,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  padding: theme.spacing(2),
  background: alpha(theme.palette.background.paper, 0.9),
  transition: "border-color 0.2s ease",
  "&:hover": {
    borderColor: alpha(theme.palette.primary.main, 0.35),
  },
}));

type LocalUserRow = {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  companyId?: string;
  companyName?: string;
  inBrowser: boolean;
  inDatabase: boolean;
};

type LocalCompanyRow = {
  id: string;
  name: string;
  ownerId?: string;
  memberCount: number;
  inBrowser: boolean;
  inDatabase: boolean;
};

type ConfirmTarget =
  | { type: "user"; row: LocalUserRow }
  | { type: "company"; row: LocalCompanyRow };

type AdminLocalUsersTabProps = {
  onMessage: (message: { type: "success" | "error"; text: string }) => void;
};

export default function AdminLocalUsersTab({ onMessage }: AdminLocalUsersTabProps) {
  const { user } = useUser();
  const currentUserId = user?.id;
  const currentCompanyId = user?.publicMetadata?.companyId as string | undefined;

  const [section, setSection] = useState(0);
  const SECTION_PROFILE = 0;
  const SECTION_USERS = 1;
  const SECTION_COMPANIES = 2;
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<LocalUserRow[]>([]);
  const [companies, setCompanies] = useState<LocalCompanyRow[]>([]);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [browserUsers, browserCompanies, dbUsersRes, dbCompaniesRes] = await Promise.all([
        isTauriBackendAvailable()
          ? tauriAuthListOfflineUsers().then((rows) =>
              rows.map((u) => ({
                id: u.id,
                email: u.email,
                username: u.username,
                firstName: u.firstName,
                lastName: u.lastName,
                companyId: u.companyId,
                metadata: u.metadata,
                passwordHash: "",
                createdAt: u.createdAt,
              }))
            )
          : offlineAuth.listUsers(),
        isTauriBackendAvailable()
          ? listLocalAppCompaniesBridge().then((res) =>
              res.success && res.data
                ? res.data.map((org) => ({
                    id: String(org._id ?? org.id),
                    name: String(org.name ?? "Company"),
                    createdByUserId: String(org.ownerId ?? ""),
                    createdAt: Date.now(),
                    trialStartedAt: "",
                    licenseExpiresAt: "",
                  }))
                : []
            )
          : getOfflineCompanies(),
        listLocalAppUsersBridge(),
        listLocalAppCompaniesBridge(),
      ]);

      const dbUsers = dbUsersRes.success && dbUsersRes.data ? dbUsersRes.data : [];
      const dbCompanies =
        dbCompaniesRes.success && dbCompaniesRes.data ? dbCompaniesRes.data : [];

      const userMap = new Map<string, LocalUserRow>();

      for (const u of browserUsers) {
        const meta = u.metadata || {};
        userMap.set(u.id, {
          id: u.id,
          email: u.email,
          displayName: memberDisplayName({
            firstName: u.firstName,
            lastName: u.lastName,
            username: u.username,
            email: u.email,
            metadata: meta,
          }),
          role: (meta.role as string | undefined) || undefined,
          companyId: u.companyId || (meta.companyId as string | undefined),
          companyName: (meta.companyName as string | undefined) || (meta.pendingCompanyName as string | undefined),
          inBrowser: true,
          inDatabase: false,
        });
      }

      for (const u of dbUsers) {
        const id = (u.id as string) || (u.clerkId as string);
        if (!id) continue;
        const existing = userMap.get(id);
        const meta = (u.metadata as Record<string, unknown>) || {};
        userMap.set(id, {
          id,
          email: (u.email as string) || existing?.email || "",
          displayName: memberDisplayName(u),
          role: (u.role as string) || existing?.role,
          companyId:
            (typeof u.orgId === "string" ? u.orgId : u.orgId?.toString?.()) ||
            existing?.companyId,
          companyName: (meta.companyName as string) || existing?.companyName,
          inBrowser: existing?.inBrowser ?? false,
          inDatabase: true,
        });
      }

      const companyMap = new Map<string, LocalCompanyRow>();

      for (const c of browserCompanies as OfflineCompany[]) {
        companyMap.set(c.id, {
          id: c.id,
          name: c.name,
          ownerId: c.createdByUserId,
          memberCount: 0,
          inBrowser: true,
          inDatabase: false,
        });
      }

      for (const org of dbCompanies) {
        const id = org._id?.toString?.() || String(org._id);
        const existing = companyMap.get(id);
        companyMap.set(id, {
          id,
          name: (org.name as string) || existing?.name || "Unnamed company",
          ownerId: (org.ownerId as string) || existing?.ownerId,
          memberCount: 0,
          inBrowser: existing?.inBrowser ?? false,
          inDatabase: true,
        });
      }

      const userRows = Array.from(userMap.values()).map((row) => {
        const company = row.companyId ? companyMap.get(row.companyId) : undefined;
        return {
          ...row,
          companyName: row.companyName || company?.name,
        };
      });

      const memberCounts = new Map<string, number>();
      for (const row of userRows) {
        if (row.companyId) {
          memberCounts.set(row.companyId, (memberCounts.get(row.companyId) || 0) + 1);
        }
      }

      const companyRows = Array.from(companyMap.values()).map((row) => ({
        ...row,
        memberCount: memberCounts.get(row.id) || 0,
      }));

      setUsers(userRows.sort((a, b) => a.displayName.localeCompare(b.displayName)));
      setCompanies(companyRows.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      onMessage({ type: "error", text: (error as Error).message || "Failed to load local users" });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async () => {
    if (!confirm) return;
    setDeleting(true);
    try {
      if (confirm.type === "user") {
        const { row } = confirm;
        if (row.id === currentUserId) {
          onMessage({ type: "error", text: "You cannot delete your own account while signed in" });
          return;
        }

        const errors: string[] = [];
        if (row.inBrowser) {
          const browserRes = isTauriBackendAvailable()
            ? await tauriAuthDeleteOfflineUser(row.id)
            : await offlineAuth.deleteUser(row.id);
          if (!browserRes.success) errors.push(browserRes.error || "Sign-in profile not removed");
          if (!isTauriBackendAvailable()) {
            await deleteOfflineJoinRequestsForUser(row.id);
          }
        }
        if (row.inDatabase) {
          const dbRes = await deleteLocalAppUserBridge(row.id);
          if (!dbRes.success) errors.push(dbRes.error || "Database user not removed");
        }

        if (errors.length) {
          onMessage({ type: "error", text: errors.join(". ") });
        } else {
          onMessage({ type: "success", text: `${row.displayName} removed from this device` });
        }
      } else {
        const { row } = confirm;
        if (row.id === currentCompanyId) {
          onMessage({ type: "error", text: "Cannot delete your active company while signed in" });
          return;
        }

        const errors: string[] = [];
        if (row.inBrowser && !isTauriBackendAvailable()) {
          const browserRes = await deleteOfflineCompany(row.id);
          if (!browserRes.success) errors.push(browserRes.error || "Browser company not removed");
        }
        if (row.inDatabase) {
          const dbRes = await deleteLocalAppCompanyBridge(row.id);
          if (!dbRes.success) errors.push(dbRes.error || "Database company not removed");
        }

        if (errors.length) {
          onMessage({ type: "error", text: errors.join(". ") });
        } else {
          onMessage({ type: "success", text: `${row.name} removed from this device` });
        }
      }

      setConfirm(null);
      await loadData();
    } catch (error) {
      onMessage({ type: "error", text: (error as Error).message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const confirmMessage = useMemo(() => {
    if (!confirm) return "";
    if (confirm.type === "user") {
      return `Remove ${confirm.row.displayName} (${confirm.row.email}) from this app? This deletes their sign-in profile and local database record on this device.`;
    }
    return `Remove ${confirm.row.name}? This deletes the company, its members, and join requests from this device.`;
  }, [confirm]);

  return (
    <StyledCard>
      <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Stack spacing={3}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ sm: "center" }}
            gap={2}
          >
            <Box>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Local users & companies
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage sign-in profiles and companies stored on this device (browser storage and local
                JSON database).
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<RefreshOutlined />}
              onClick={loadData}
              disabled={loading}
              sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
            >
              Refresh
            </Button>
          </Stack>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Only the organisation owner can see this tab. Deletions are permanent on this device and
            cannot be undone without a backup.
          </Alert>

          <Tabs
            value={section}
            onChange={(_, value) => setSection(value)}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="My profile" sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`Users (${users.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
            <Tab label={`Companies (${companies.length})`} sx={{ textTransform: "none", fontWeight: 600 }} />
          </Tabs>

          {section === SECTION_PROFILE ? (
            <UserProfileForm
              compact
              title="Your profile"
              description="Update your own account details. Saved to browser sign-in storage and the local database."
              onMessage={onMessage}
            />
          ) : loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : section === SECTION_USERS ? (
            <Stack spacing={1.5}>
              {users.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  No local users on this device
                </Typography>
              ) : (
                users.map((row) => {
                  const isSelf = row.id === currentUserId;
                  return (
                    <RowCard key={row.id}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: "primary.main" }}>{memberInitial(row)}</Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>
                            {row.displayName}
                            {isSelf ? " (you)" : ""}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {row.email}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                            {row.role && <Chip size="small" label={row.role} />}
                            {row.companyName && (
                              <Chip size="small" variant="outlined" label={row.companyName} />
                            )}
                            {row.inBrowser && (
                              <Chip
                                size="small"
                                icon={<DevicesOutlined sx={{ fontSize: 14 }} />}
                                label="Sign-in"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {row.inDatabase && (
                              <Chip
                                size="small"
                                icon={<StorageOutlined sx={{ fontSize: 14 }} />}
                                label="Database"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                        <IconButton
                          color="error"
                          disabled={isSelf}
                          onClick={() => setConfirm({ type: "user", row })}
                          aria-label={`Delete ${row.displayName}`}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Stack>
                    </RowCard>
                  );
                })
              )}
            </Stack>
          ) : section === SECTION_COMPANIES ? (
            <Stack spacing={1.5}>
              {companies.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                  No local companies on this device
                </Typography>
              ) : (
                companies.map((row) => {
                  const isActive = row.id === currentCompanyId;
                  return (
                    <RowCard key={row.id}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar sx={{ bgcolor: alpha("#0AA775", 0.15), color: "primary.main" }}>
                          <BusinessOutlined />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography fontWeight={600} noWrap>
                            {row.name}
                            {isActive ? " (active)" : ""}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {row.memberCount} member{row.memberCount === 1 ? "" : "s"}
                          </Typography>
                          <Stack direction="row" spacing={0.75} sx={{ mt: 1, flexWrap: "wrap", gap: 0.75 }}>
                            {row.inBrowser && (
                              <Chip
                                size="small"
                                icon={<DevicesOutlined sx={{ fontSize: 14 }} />}
                                label="Sign-in"
                                color="primary"
                                variant="outlined"
                              />
                            )}
                            {row.inDatabase && (
                              <Chip
                                size="small"
                                icon={<StorageOutlined sx={{ fontSize: 14 }} />}
                                label="Database"
                                variant="outlined"
                              />
                            )}
                          </Stack>
                        </Box>
                        <IconButton
                          color="error"
                          disabled={isActive}
                          onClick={() => setConfirm({ type: "company", row })}
                          aria-label={`Delete ${row.name}`}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Stack>
                    </RowCard>
                  );
                })
              )}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>

      <Dialog open={Boolean(confirm)} onClose={() => !deleting && setConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {confirm?.type === "user" ? "Remove local user?" : "Remove local company?"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {confirmMessage}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirm(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <DeleteOutline />}
          >
            {deleting ? "Removing…" : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </StyledCard>
  );
}
