"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  Paper,
  Divider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
  Stack,
  FormGroup,
  Checkbox,
  Grid,
  alpha,
  styled,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  InputAdornment,
} from "@mui/material";
import {
  Business,
  People,
  Settings,
  CheckCircle,
  Cancel,
  PersonAdd,
  Upload,
  Image as ImageIcon,
  Email,
  LocationOn,
  AccountBalance,
  Person,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  WorkspacePremium,
  Notifications,
  NotificationsOff,
  Api,
  TrendingUp,
  CheckCircleOutline,
  Close,
  PhoneIphone,
  Security,
  Bolt,
  CreditCard,
  AccountBalanceWallet,
  Payment,
  Extension,
  CloudSync,
} from "@mui/icons-material";
import { useUser } from "@/lib/auth/client";
import { useSearchParams } from "next/navigation";
import {
  approveJoinRequestBridge,
  loadAdminPanel,
  rejectJoinRequestBridge,
  updateOrgBridge,
  updateOrgPlanBridge,
  updateUserAllowedModulesBridge,
} from "@/lib/desktop/admin-bridge";
import { MODULE_LABELS } from "@/lib/access-control";
import { useAccessControl } from "@/hooks/useAccessControl";
import {
  initiatePlanPayment,
  checkPlanPaymentStatus,
  getPaymentsForCurrentOrg,
} from "@/lib/desktop/payments-bridge";
import AdminShell, { ADMIN_TAB_ICONS } from "./components/AdminShell";
import AdminBackupTab from "./components/AdminBackupTab";
import AdminSettingsTab from "./components/AdminSettingsTab";
import AdminReceiptDesignTab from "./components/AdminReceiptDesignTab";
import AdminLocalUsersTab from "./components/AdminLocalUsersTab";
import { syncLicenseFromServerBridge } from "@/lib/desktop/licensing-bridge";
import { FREE_TRIAL_PLAN, isFreeTrialPlan } from "@/lib/plan-defaults";
import type { LicenseStatus } from "@/lib/license-utils";
import { openLicenseRenewal } from "@/lib/license-renewal";
import { memberDisplayName, memberInitial } from "@/lib/member-display";
import { FlatCard } from "@/components/FlatCard";

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: 20,
  boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.06)}`,
  transition: "all 0.25s ease",
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.95),
  backdropFilter: "blur(8px)",
  "&:hover": {
    boxShadow: `0 12px 40px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}));

const RequestCard = styled(Card)(({ theme }) => ({
  borderRadius: 16,
  border: `1px solid ${alpha(theme.palette.divider, 0.35)}`,
  background: alpha(theme.palette.background.paper, 0.9),
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: alpha(theme.palette.primary.main, 0.5),
    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
  },
}));

const MemberCard = styled(FlatCard)({
  transition: "all 0.2s ease",
  "&:hover": {
    borderColor: "primary.main",
  },
});

const PlanCard = styled(Card, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  borderRadius: 16,
  border: `2px solid ${selected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.3)}`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: selected
    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.dark, 0.05)})`
    : 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.15)}`,
    transform: 'translateY(-4px)',
  },
}));

const LogoUploadArea = styled(Box)(({ theme }) => ({
  width: 200,
  height: 200,
  borderRadius: 16,
  border: `2px dashed ${alpha(theme.palette.primary.main, 0.3)}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  background: alpha(theme.palette.primary.main, 0.02),
  '&:hover': {
    borderColor: theme.palette.primary.main,
    background: alpha(theme.palette.primary.main, 0.05),
  },
}));

const StatCard = styled(FlatCard)(({ theme }) => ({
  padding: theme.spacing(2),
}));

const PaymentHighlightCard = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  padding: theme.spacing(3),
  background: theme.palette.background.paper,
  border: `1px solid ${alpha(theme.palette.divider, 0.55)}`,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1.5),
}));

const PaymentInputCard = styled(Box)(({ theme }) => ({
  borderRadius: 16,
  padding: theme.spacing(3),
  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
  background: alpha(theme.palette.background.paper, 0.9),
  boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.4)}`,
}));

const PLAN_TAB_INDEX = 3;
const BACKUP_TAB_INDEX = 5;
const RECEIPT_TAB_INDEX = 6;
const LOCAL_USERS_TAB_INDEX = 7;
const BRAND_PRIMARY = "#0AA775";

export default function AdministrationPanel() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const searchParams = useSearchParams();
  const role = (user?.publicMetadata?.role as string) || "";
  const { isOwner } = useAccessControl();
  const [tabIndex, setTabIndex] = useState(0);
  const isExpiredLicense = searchParams.get('expired') === '1';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

  // Company Profile State
  const [companyData, setCompanyData] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Join Requests State
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  // Members State
  const [members, setMembers] = useState<any[]>([]);
  const [memberDialog, setMemberDialog] = useState({ open: false, member: null as any });
  const [modulesDialog, setModulesDialog] = useState<{ open: boolean; member: any }>({ open: false, member: null });
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [modulesSaving, setModulesSaving] = useState(false);

  // Plan State
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [apiUsage, setApiUsage] = useState({ used: 0, limit: 1000 });
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; plan: any; paymentId: string | null }>({
    open: false,
    plan: null,
    paymentId: null,
  });
  const [paymentForm, setPaymentForm] = useState({ 
    msisdn: '263', 
    amount: 0,
    paymentMethod: 'paynow' as 'paynow' | 'ecocash' | 'telecash' | 'onemoney' | 'card'
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [syncingLicense, setSyncingLicense] = useState(false);
  const loadInFlight = useRef(false);
  const userId = user?.id;

  const loadData = useCallback(async () => {
    if (!isUserLoaded) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    if (loadInFlight.current) return;
    loadInFlight.current = true;
    setLoading(true);
    try {
      const panel = await loadAdminPanel(isOwner);
      if (!panel?.companyContext.success) {
        setSnackbar({
          open: true,
          message: panel?.companyContext.error || 'Company not found for this account',
          severity: 'error',
        });
        return;
      }

      const org = panel.org;
      if (org) {
        setCompanyData(org);
        setCompanyName((org.name as string) || "");
        setCompanyEmail((org.email as string) || "");
        setCompanyAddress((org.address as string) || "");
        setTaxId((org.taxId as string) || "");
        setLogoUrl((org.logoUrl as string) || "");

        const plan = panel.currentPlan ?? FREE_TRIAL_PLAN;
        setCurrentPlan(plan);
        setApiUsage({
          used: (org.usage as { month?: { calls?: number } } | undefined)?.month?.calls || 0,
          limit: (plan as { apiLimitMonthly?: number }).apiLimitMonthly || 1000,
        });
      }

      if (panel.licenseStatus) {
        setLicenseStatus(panel.licenseStatus);
        if (!panel.licenseStatus.isExpired && panel.licenseStatus.isInTrial) {
          setCurrentPlan((plan: any) =>
            plan && !isFreeTrialPlan(plan.slug) ? plan : FREE_TRIAL_PLAN
          );
        }
      }

      setAllPlans(panel.allPlans as any[]);
      setJoinRequests(isOwner ? (panel.joinRequests as any[]) : []);
      setMembers(panel.members as any[]);
      setPayments(panel.payments as any[]);
    } catch (error) {
      console.error('Error loading data:', error);
      setSnackbar({
        open: true,
        message: `Failed to load admin: ${error instanceof Error ? error.message : 'unknown error'}`,
        severity: 'error',
      });
    } finally {
      loadInFlight.current = false;
      setLoading(false);
    }
  }, [userId, isUserLoaded, isOwner]);

  useEffect(() => {
    if (!isUserLoaded) return;
    loadData();
  }, [isUserLoaded, loadData]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'plan') setTabIndex(PLAN_TAB_INDEX);
    if (tab === 'backup') setTabIndex(BACKUP_TAB_INDEX);
    if (tab === 'receipt') setTabIndex(RECEIPT_TAB_INDEX);
    if (tab === 'local-users') setTabIndex(LOCAL_USERS_TAB_INDEX);
  }, [searchParams]);

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      const companyId = user?.publicMetadata?.companyId as string;
      if (!companyId) {
        setSnackbar({ open: true, message: 'Company ID not found', severity: 'error' });
        return;
      }

      // TODO: Handle logo upload to storage service
      const updateData: any = {
        name: companyName,
        email: companyEmail,
        address: companyAddress,
        taxId: taxId,
      };

      if (logoUrl) {
        updateData.logoUrl = logoUrl;
      }

      const result = await updateOrgBridge(companyId, updateData);
      if (result.success) {
        setSnackbar({ open: true, message: 'Company profile updated successfully', severity: 'success' });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to update company', severity: 'error' });
      }
    } catch (error) {
      console.error('Error saving company:', error);
      setSnackbar({ open: true, message: 'Failed to save company profile', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const canManageModules = isOwner || role === "admin";

  const openModulesDialog = (member: any) => {
    const allowed = member?.public_metadata?.allowedModules ?? member?.publicMetadata?.allowedModules;
    setSelectedModules(Array.isArray(allowed) ? [...allowed] : []);
    setModulesDialog({ open: true, member });
  };

  const closeModulesDialog = () => {
    setModulesDialog({ open: false, member: null });
  };

  const handleModulesSave = async () => {
    const member = modulesDialog.member;
    if (!member) return;
    setModulesSaving(true);
    try {
      const userId = member.id || member.clerkId;
      const res = await updateUserAllowedModulesBridge(userId, selectedModules);
      if (res.success) {
        setSnackbar({ open: true, message: 'Access updated', severity: 'success' });
        closeModulesDialog();
        loadData();
      } else {
        setSnackbar({ open: true, message: res.error || 'Failed to update access', severity: 'error' });
      }
    } catch (e) {
      setSnackbar({ open: true, message: 'Failed to update access', severity: 'error' });
    } finally {
      setModulesSaving(false);
    }
  };

  const handleChangePlan = async (planId: string) => {
    if (!planId) {
      setSnackbar({ open: true, message: 'Plan ID is required', severity: 'error' });
      return;
    }

    setSaving(true);
    try {
      const companyId = user?.publicMetadata?.companyId as string;
      if (!companyId) {
        setSnackbar({ open: true, message: 'Company ID not found', severity: 'error' });
        return;
      }

      const result = await updateOrgPlanBridge(companyId, planId);
      if (result.success) {
        setSnackbar({ open: true, message: 'Plan updated successfully', severity: 'success' });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to update plan', severity: 'error' });
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      setSnackbar({ open: true, message: 'Failed to change plan', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPaymentDialog = (plan: any) => {
    setPaymentDialog({ open: true, plan, paymentId: null });
    setPaymentForm({
      msisdn: '263',
      amount: plan?.priceMonthly || 0,
      paymentMethod: 'paynow',
    });
  };

  const handleClosePaymentDialog = () => {
    setPaymentDialog({ open: false, plan: null, paymentId: null });
    setPaymentForm({ msisdn: '263', amount: 0, paymentMethod: 'paynow' });
    setPaymentLoading(false);
    setCheckingPayment(false);
  };

  const handleMsisdnChange = (value: string) => {
    setPaymentForm((prev) => ({ ...prev, msisdn: normalizeMsisdn(value) }));
  };

  const handleSubmitPlanPayment = async () => {
    if (!paymentDialog.plan) return;
    const companyId = user?.publicMetadata?.companyId as string;

    if (!companyId) {
      setSnackbar({ open: true, message: 'Company ID not found', severity: 'error' });
      return;
    }

    // Mobile number is optional - PayNow will handle payment method selection
    // Only validate if user wants to use mobile money (but PayNow handles this on their platform)
    // We'll still send msisdn if provided, but it's not required for card payments

    setPaymentLoading(true);
    try {
      const result = await initiatePlanPayment({
        orgId: companyId,
        planId: paymentDialog.plan._id?.toString(),
        planName: paymentDialog.plan.name,
        amount: paymentDialog.plan.priceMonthly || paymentForm.amount || 0,
        currency: 'USD',
        msisdn: paymentForm.msisdn && /^263\d{9}$/.test(paymentForm.msisdn) ? paymentForm.msisdn : '',
        reason: `Upgrade to ${paymentDialog.plan.name}`,
      });

      if (result.success) {
        // If PayNow returns a browser URL, redirect user to complete payment
        if (result.data?.browserUrl) {
          window.open(result.data.browserUrl, '_blank');
          setSnackbar({
            open: true,
            message: 'Redirecting to PayNow to complete payment...',
            severity: 'info',
          });
        } else {
          setSnackbar({
            open: true,
            message: 'Payment initiated. Complete payment on PayNow then check status.',
            severity: 'info',
          });
        }
        setPaymentDialog((prev) => ({ ...prev, paymentId: result.data?.paymentId || null }));

        const paymentsRes = await getPaymentsForCurrentOrg();
        if (paymentsRes.success && 'data' in paymentsRes && paymentsRes.data) {
          setPayments(paymentsRes.data);
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to start payment', severity: 'error' });
      }
    } catch (error) {
      console.error('Error initiating plan payment:', error);
      setSnackbar({ open: true, message: 'Failed to start payment', severity: 'error' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSyncLicense = async () => {
    if (!isOwner) {
      setSnackbar({ open: true, message: 'Only the organisation owner can sync the licence', severity: 'error' });
      return;
    }
    setSyncingLicense(true);
    try {
      const result = await syncLicenseFromServerBridge();
      if (!result.success || !result.data) {
        setSnackbar({ open: true, message: result.error || 'Licence sync failed', severity: 'error' });
        return;
      }
      setLicenseStatus(result.data);
      const expiry = new Date(result.data.licenseExpiresAt || '').toLocaleDateString();
      setSnackbar({
        open: true,
        message: `Licence synced — valid until ${expiry} (${result.data.daysRemaining} day(s) remaining)`,
        severity: 'success',
      });
      await loadData();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Licence sync failed: ${(error as Error).message}`,
        severity: 'error',
      });
    } finally {
      setSyncingLicense(false);
    }
  };

  const handleCheckPlanPaymentStatus = async () => {
    if (!paymentDialog.paymentId) return;

    setCheckingPayment(true);
    try {
      const result = await checkPlanPaymentStatus(paymentDialog.paymentId);
      if (result.success) {
        const status = result.data?.status;
        setSnackbar({
          open: true,
          message: `Payment status: ${status}`,
          severity: status === 'completed' ? 'success' : 'info',
        });

        if (status === 'completed') {
          await loadData();
          handleClosePaymentDialog();
        } else {
          const paymentsRes = await getPaymentsForCurrentOrg();
          if (paymentsRes.success && 'data' in paymentsRes && paymentsRes.data) {
            setPayments(paymentsRes.data);
          }
        }
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to check status', severity: 'error' });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setSnackbar({ open: true, message: 'Failed to check payment status', severity: 'error' });
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    if (!isOwner) {
      setSnackbar({ open: true, message: 'Only the owner can approve requests', severity: 'error' });
      return;
    }
    setProcessingRequest(requestId);
    try {
      const result = await approveJoinRequestBridge(requestId);
      if (result.success) {
        setSnackbar({ open: true, message: 'Join request approved successfully', severity: 'success' });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to approve request', severity: 'error' });
      }
    } catch (error) {
      console.error('Error approving request:', error);
      setSnackbar({ open: true, message: 'Failed to approve request', severity: 'error' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!isOwner) {
      setSnackbar({ open: true, message: 'Only the owner can reject requests', severity: 'error' });
      return;
    }
    setProcessingRequest(requestId);
    try {
      const result = await rejectJoinRequestBridge(requestId);
      if (result.success) {
        setSnackbar({ open: true, message: 'Join request rejected', severity: 'success' });
        loadData();
      } else {
        setSnackbar({ open: true, message: result.error || 'Failed to reject request', severity: 'error' });
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      setSnackbar({ open: true, message: 'Failed to reject request', severity: 'error' });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDate = (date: string | Date) => {
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(date);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'error';
      case 'admin':
        return 'warning';
      case 'manager':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPlanColor = (slug: string) => {
    switch (slug) {
      case 'enterprise':
        return 'error'; // Red/Premium color for enterprise
      case 'pro':
        return 'warning'; // Orange for pro
      case 'free':
        return 'default'; // Gray for free
      default:
        return 'primary';
    }
  };

  const formatPlanPrice = (price?: number, slug?: string) => {
    if (slug === 'enterprise' || (price === 0 && slug === 'enterprise')) {
      return 'Custom Pricing';
    }
    if (!price || price <= 0) return 'Free';
    return `$${price.toLocaleString()}/mo`;
  };

  const formatCurrencyValue = (price?: number, currency = 'USD') => {
    if (!price) return `${currency} 0.00`;
    return `${currency} ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

const normalizeMsisdn = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '263';

  if (digitsOnly.startsWith('263')) {
    return digitsOnly.slice(0, 12);
  }

  if (digitsOnly.startsWith('0')) {
    return `263${digitsOnly.slice(1, 10)}`;
  }

  const trimmed = digitsOnly.replace(/^263/, '').replace(/^0/, '');
  return `263${trimmed}`.slice(0, 12);
};

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
      case 'pending':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const apiUsagePercentage = (apiUsage.limit > 0) ? (apiUsage.used / apiUsage.limit) * 100 : 0;

  const activePayment = useMemo(() => {
    if (!paymentDialog.paymentId) return null;
    return payments.find((payment) => payment._id === paymentDialog.paymentId) || null;
  }, [paymentDialog.paymentId, payments]);

  const pendingRequestCount = joinRequests.filter((r) => r.status === "pending").length;
  const isFreeTrial =
    (licenseStatus?.isInTrial && !licenseStatus.isExpired) || isFreeTrialPlan(currentPlan?.slug);
  const trialDaysRemaining = licenseStatus?.daysRemaining;

  const adminTabs = useMemo(
    () => [
      { id: 0, label: "Company", description: "Profile & branding", icon: ADMIN_TAB_ICONS.company },
      {
        id: 1,
        label: "Join requests",
        description: "Approve new users",
        icon: ADMIN_TAB_ICONS.requests,
        disabled: !isOwner,
        badge: pendingRequestCount,
      },
      { id: 2, label: "Members", description: "Team & module access", icon: ADMIN_TAB_ICONS.members, badge: members.length },
      { id: 3, label: "Plan & billing", description: "Subscription & API", icon: ADMIN_TAB_ICONS.plan },
      { id: 4, label: "Settings", description: "Notifications & theme", icon: ADMIN_TAB_ICONS.settings },
      { id: 5, label: "Backup", description: "Export & restore data", icon: ADMIN_TAB_ICONS.backup },
      { id: 6, label: "Receipt design", description: "Layout & features", icon: ADMIN_TAB_ICONS.receipt },
      ...(isOwner
        ? [
            {
              id: LOCAL_USERS_TAB_INDEX,
              label: "Local users",
              description: "Device sign-in & companies",
              icon: ADMIN_TAB_ICONS.localUsers,
            },
          ]
        : []),
    ],
    [isOwner, pendingRequestCount, members.length]
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Loading administration panel…
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!isOwner) {
    return (
      <Box sx={{ p: 3, width: "100%", maxWidth: 520, mx: "auto", mt: 6 }}>
        <StyledCard>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Security sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Access restricted
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Only the organisation owner can open the Administration panel.
            </Typography>
          </CardContent>
        </StyledCard>
      </Box>
    );
  }

  return (
    <AdminShell
      tabIndex={tabIndex}
      onTabChange={setTabIndex}
      companyName={companyName || companyData?.name}
      planName={currentPlan?.name}
      planSlug={currentPlan?.slug}
      isFreeTrial={isFreeTrial}
      trialDaysRemaining={trialDaysRemaining}
      stats={{
        members: members.length,
        pendingRequests: pendingRequestCount,
        apiUsed: apiUsage.used,
        apiLimit: apiUsage.limit,
      }}
      tabs={adminTabs}
    >

      {/* Company Profile Tab */}
      {tabIndex === 0 && (
        <StyledCard>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={4}>
              <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 700 }}>
                  Company Information
                </Typography>

                {/* Logo Upload */}
                <Box sx={{ mb: 4, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="logo-upload"
                    type="file"
                    onChange={handleLogoUpload}
                  />
                  <label htmlFor="logo-upload">
                    <LogoUploadArea>
                      {logoUrl ? (
                        <Box
                          component="img"
                          src={logoUrl}
                          alt="Company Logo"
                          sx={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: 14,
                          }}
                        />
                      ) : (
                        <Stack spacing={1} alignItems="center">
                          <ImageIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            Upload Logo
                          </Typography>
                        </Stack>
                      )}
                    </LogoUploadArea>
                  </label>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Company logo will be displayed on receipts, invoices, and other company documents.
                      Recommended size: 200x200px
          </Typography>
                    <Button
                      variant="outlined"
                      startIcon={<Upload />}
                      component="label"
                      htmlFor="logo-upload"
                    >
                      Change Logo
                    </Button>
                  </Box>
                </Box>

                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Company Name"
            fullWidth
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
                      InputProps={{
                        startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      label="Tax ID / Registration Number"
                      fullWidth
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      InputProps={{
                        startAdornment: <AccountBalance sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Email"
            fullWidth
                      type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
          />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            label="Address"
            fullWidth
            value={companyAddress}
            onChange={(e) => setCompanyAddress(e.target.value)}
                      InputProps={{
                        startAdornment: <LocationOn sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    onClick={() => loadData()}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleSaveCompany}
                    disabled={saving || !companyName}
                    sx={{
                      background: `linear-gradient(135deg, ${BRAND_PRIMARY}, ${alpha(BRAND_PRIMARY, 0.7)})`,
                      '&:hover': {
                        background: `linear-gradient(135deg, ${alpha(BRAND_PRIMARY, 0.9)}, ${alpha(BRAND_PRIMARY, 0.6)})`,
                      },
                    }}
                  >
                    {saving ? <CircularProgress size={20} /> : 'Save Changes'}
          </Button>
        </Box>
              </Box>
            </Stack>
          </CardContent>
        </StyledCard>
      )}

      {/* Join Requests Tab */}
      {tabIndex === 1 && (
        <Box>
          {!isOwner ? (
            <StyledCard>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Only the organization owner can view join requests.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please contact your owner or administrator if you believe this is an error.
                </Typography>
              </CardContent>
            </StyledCard>
          ) : (
            <>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  Join Requests
                </Typography>
                <Chip
                  label={`${joinRequests.filter((r) => r.status === 'pending').length} Pending`}
                  color="warning"
                  size="small"
                />
              </Box>

              {joinRequests.length === 0 ? (
                <StyledCard>
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <PersonAdd sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                      No join requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Users who request to join your company will appear here
                    </Typography>
                  </CardContent>
                </StyledCard>
              ) : (
                <Grid container spacing={2}>
                  {joinRequests.map((request) => (
                    <Grid size={{ xs: 12, md: 6 }} key={request._id}>
                      <RequestCard>
                        <CardContent>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                  {request.userName?.charAt(0)?.toUpperCase() || 'U'}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {request.userName}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {request.userEmail}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip
                                label={request.status}
                                color={getStatusColor(request.status) as any}
                                size="small"
                              />
                            </Box>

                            <Divider />

                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                Requested: {formatDate(request.requestedAt)}
                              </Typography>
                              {request.reviewedAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Reviewed: {formatDate(request.reviewedAt)}
                                </Typography>
                              )}
                            </Box>

                            {request.status === 'pending' && (
                              <Stack direction="row" spacing={1}>
                                <Button
                                  variant="contained"
                                  color="success"
                                  startIcon={<CheckCircle />}
                                  fullWidth
                                  onClick={() => handleApproveRequest(request._id)}
                                  disabled={processingRequest === request._id}
                                  sx={{ borderRadius: 2 }}
                                >
                                  {processingRequest === request._id ? (
                                    <CircularProgress size={20} />
                                  ) : (
                                    'Approve'
                                  )}
                                </Button>
                                <Button
                                  variant="outlined"
                                  color="error"
                                  startIcon={<Cancel />}
                                  fullWidth
                                  onClick={() => handleRejectRequest(request._id)}
                                  disabled={processingRequest === request._id}
                                  sx={{ borderRadius: 2 }}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            )}
                          </Stack>
                        </CardContent>
                      </RequestCard>
                    </Grid>
                  ))}
                </Grid>
              )}
            </>
          )}
        </Box>
      )}

      {/* Members Tab */}
      {tabIndex === 2 && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Team Members
            </Typography>
            <Chip label={`${members.length} Members`} color="primary" size="small" />
          </Box>

          {members.length === 0 ? (
            <StyledCard>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <People sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No members found
                </Typography>
              </CardContent>
            </StyledCard>
          ) : (
            <Grid container spacing={2}>
              {members.map((member) => (
                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={member.id || member.clerkId || member._id || member.email}>
                  <MemberCard>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                          <Avatar
                            src={member.imageUrl}
                            sx={{ width: 56, height: 56 }}
                          >
                            {memberInitial(member)}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                              {memberDisplayName(member)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {member.emailAddresses?.[0]?.emailAddress || member.email || 'No email'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={member.role || member.public_metadata?.role || 'user'}
                            color={getRoleColor(member.role || member.public_metadata?.role) as any}
                            size="small"
                          />
                          {member.public_metadata?.dep && (
                            <Chip
                              label={member.public_metadata.dep}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        {canManageModules && (
                          <Button
                            size="small"
                            startIcon={<Extension />}
                            variant="contained"
                            onClick={() => openModulesDialog(member)}
                            sx={{ textTransform: "none", fontWeight: 600, borderRadius: 2 }}
                          >
                            Manage access
                          </Button>
                        )}
                      </Stack>
                    </CardContent>
                  </MemberCard>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Module access dialog */}
      <Dialog open={modulesDialog.open} onClose={closeModulesDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Module access
          {modulesDialog.member && (
            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              — {memberDisplayName(modulesDialog.member)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose which modules this user can see and open. Dashboard is always included. Users without
            assignments can only access the dashboard until modules are selected here.
          </Typography>
          <FormGroup>
            {Object.entries(MODULE_LABELS).map(([key, label]) => (
              <FormControlLabel
                key={key}
                control={
                  <Checkbox
                    checked={selectedModules.includes(key)}
                    onChange={(_, checked) => {
                      if (checked) setSelectedModules((p) => [...p, key]);
                      else setSelectedModules((p) => p.filter((k) => k !== key));
                    }}
                  />
                }
                label={label}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeModulesDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleModulesSave} disabled={modulesSaving}>
            {modulesSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Plan & Usage Tab */}
      {tabIndex === 3 && (
        <Box>
          {isExpiredLicense && (
            <Alert
              severity="error"
              icon={<WorkspacePremium />}
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" variant="outlined" onClick={openLicenseRenewal}>
                  Renew licence
                </Button>
              }
            >
              Your licence has expired. Renew at thinkingminds.co.zw to restore access to all modules.
            </Alert>
          )}
          {isFreeTrial && !isExpiredLicense && !licenseStatus?.isExpired && (
            <Alert severity="info" icon={<WorkspacePremium />} sx={{ mb: 3 }}>
              You are on a <strong>free trial</strong>
              {trialDaysRemaining != null
                ? ` — ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining`
                : ""}
              . All modules are unlocked until the trial ends. Choose a paid plan below to continue after that.
            </Alert>
          )}

          {isOwner && (
            <StyledCard sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  alignItems={{ sm: 'center' }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <CloudSync sx={{ fontSize: 36, color: 'primary.main', mt: 0.25 }} />
                    <Box>
                      <Typography variant="h6" fontWeight={700}>
                        Sync licence
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 520 }}>
                        Contact thinkingminds.co.zw to renew, then sync here to pull your updated expiry date
                        {licenseStatus?.licenseExpiresAt
                          ? ` (currently ${new Date(licenseStatus.licenseExpiresAt).toLocaleDateString()})`
                          : ''}
                        .
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1.5} flexShrink={0}>
                    <Button variant="outlined" onClick={openLicenseRenewal} sx={{ textTransform: 'none', fontWeight: 600 }}>
                      Renew online
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSyncLicense}
                      disabled={syncingLicense}
                      startIcon={syncingLicense ? <CircularProgress size={18} color="inherit" /> : <CloudSync />}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      {syncingLicense ? 'Syncing…' : 'Sync licence'}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </StyledCard>
          )}

          <Typography variant="h5" sx={{ mb: 4, fontWeight: 700 }}>
            Plan & Usage
          </Typography>

          {currentPlan ? (
            <Grid container spacing={3}>
              {/* Current Plan Card */}
              <Grid size={{ xs: 12, md: 8 }}>
                <StyledCard>
                  <CardContent sx={{ p: 4 }}>
                    <Stack spacing={3}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                            {currentPlan.name}
                          </Typography>
                          <Chip
                            label={isFreeTrialPlan(currentPlan.slug) ? "FREE TRIAL" : currentPlan.slug.toUpperCase()}
                            color={isFreeTrialPlan(currentPlan.slug) ? "info" : (getPlanColor(currentPlan.slug) as any)}
                            size="small"
                          />
                          {isFreeTrial && trialDaysRemaining != null && (
                            <Chip
                              label={`${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left`}
                              color={trialDaysRemaining <= 7 ? "warning" : "info"}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                          {currentPlan.supportLevel && (
                            <Chip
                              label={`${currentPlan.supportLevel} support`}
                              variant="outlined"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                        <WorkspacePremium sx={{ fontSize: 48, color: 'primary.main' }} />
                      </Box>

                      {currentPlan.description && (
                        <Typography variant="body2" color="text.secondary">
                          {currentPlan.description}
                        </Typography>
                      )}

                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                        <Typography variant="h4" fontWeight={700}>
                          {formatPlanPrice(currentPlan.priceMonthly, currentPlan.slug)}
                        </Typography>
                        {currentPlan.customizable && (
                          <Chip label="Customisable" size="small" color="success" />
                        )}
                      </Box>

                      <Divider />

                      {/* API Usage */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" fontWeight={600}>
                            API Calls This Month
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {apiUsage.used.toLocaleString()} / {apiUsage.limit.toLocaleString()}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(apiUsagePercentage, 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: alpha('#000', 0.1),
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4,
                              background: apiUsagePercentage > 90
                                ? 'linear-gradient(90deg, #f44336, #d32f2f)'
                                : apiUsagePercentage > 70
                                ? 'linear-gradient(90deg, #ff9800, #f57c00)'
                                : 'linear-gradient(90deg, #4caf50, #388e3c)',
                            },
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {apiUsage.limit - apiUsage.used} calls remaining
                        </Typography>
                      </Box>

                      {/* Plan Features */}
                      <Box>
                        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                          Plan Features
                        </Typography>
                        <Grid container spacing={2}>
                          {currentPlan.features?.map((feature: string, index: number) => (
                            <Grid size={{ xs: 12, sm: 6 }} key={index}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircleOutline sx={{ fontSize: 20, color: 'success.main' }} />
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                  {feature}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                    </Stack>
                  </CardContent>
                </StyledCard>
              </Grid>

              {/* Usage Stats */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={2}>
                  <StatCard>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Monthly Limit
                      </Typography>
                      <Typography variant="h4" fontWeight={700}>
                        {apiUsage.limit.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        API calls
                      </Typography>
                    </Stack>
                  </StatCard>

                  <StatCard>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Used This Month
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="primary.main">
                        {apiUsage.used.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {apiUsagePercentage.toFixed(1)}% of limit
                      </Typography>
                    </Stack>
                  </StatCard>

                  <StatCard>
                    <Stack spacing={1}>
                      <Typography variant="caption" color="text.secondary">
                        Remaining
                      </Typography>
                      <Typography variant="h4" fontWeight={700} color="success.main">
                        {Math.max(0, apiUsage.limit - apiUsage.used).toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        API calls
                      </Typography>
                    </Stack>
                  </StatCard>
                </Stack>
              </Grid>

              {/* Available Plans */}
              {allPlans.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Available Plans
                  </Typography>
                  <Grid container spacing={2}>
                    {allPlans.map((plan) => (
                      <Grid size={{ xs: 12, md: 4 }} key={plan._id}>
                        <PlanCard selected={plan._id?.toString() === currentPlan._id?.toString()}>
                          <CardContent>
                            <Stack spacing={2}>
                              <Box>
                                <Typography variant="h6" fontWeight={700}>
                                  {plan.name}
                                </Typography>
                                <Chip
                                  label={plan.slug.toUpperCase()}
                                  color={getPlanColor(plan.slug) as any}
                                  size="small"
                                  sx={{ mt: 1 }}
                                />
                                {plan.supportLevel && (
                                  <Chip
                                    label={`${plan.supportLevel} support`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mt: 1, ml: 1 }}
                                  />
                                )}
                              </Box>
                              <Box>
                                <Typography variant="h5" fontWeight={700} color="primary.main">
                                  {formatPlanPrice(plan.priceMonthly, plan.slug)}
                                </Typography>
                                {plan.slug !== 'enterprise' ? (
                                  <Typography variant="body2" color="text.secondary">
                                    {plan.apiLimitMonthly.toLocaleString()} API calls / month
                                  </Typography>
                                ) : (
                                  <Typography variant="body2" color="text.secondary">
                                    Unlimited API calls
                                  </Typography>
                                )}
                              </Box>
                              {plan.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {plan.description}
                                </Typography>
                              )}
                              <Box>
                                {plan.features?.map((feature: string, index: number) => (
                                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <CheckCircleOutline sx={{ fontSize: 16, color: 'success.main' }} />
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                      {feature}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                              {plan._id?.toString() !== currentPlan._id?.toString() && (
                                <Button
                                  variant={plan.slug === 'enterprise' ? 'contained' : 'outlined'}
                                  fullWidth
                                  sx={{ mt: 2 }}
                                  onClick={() => {
                                    if (plan.slug === 'enterprise') {
                                      setSnackbar({
                                        open: true,
                                        message: 'Please contact sales for customized plan pricing',
                                        severity: 'info' as 'info',
                                      });
                                    } else if (plan.slug !== 'free') {
                                      openLicenseRenewal();
                                    } else {
                                      handleChangePlan(plan._id);
                                    }
                                  }}
                                  disabled={saving}
                                >
                                  {saving ? (
                                    <CircularProgress size={20} />
                                  ) : plan.slug === 'enterprise' ? (
                                    'Contact Sales'
                                  ) : plan.slug === 'free' ? (
                                    'Switch to Free'
                                  ) : (
                                    'Renew licence'
                                  )}
                                </Button>
                              )}
                            </Stack>
                          </CardContent>
                        </PlanCard>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}

              {payments.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ mt: 4, mb: 2, fontWeight: 600 }}>
                    Recent Payments
                  </Typography>
                  <Grid container spacing={2}>
                    {payments.map((payment) => (
                      <Grid size={{ xs: 12, md: 6 }} key={payment._id}>
                        <StyledCard>
                          <CardContent sx={{ p: 3 }}>
                            <Stack spacing={1.5}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Typography variant="subtitle2" color="text.secondary">
                                    {payment.planName || 'Plan Upgrade'}
                                  </Typography>
                                  <Typography variant="h5" fontWeight={700}>
                                    {formatCurrencyValue(payment.amount, payment.currency || 'USD')}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={payment.status?.toUpperCase()}
                                  color={getPaymentStatusColor(payment.status) as any}
                                  size="small"
                                />
                              </Box>
                              <Typography variant="body2" color="text.secondary">
                                Mobile: {payment.msisdn}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Reference: {payment.sourceReference}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(payment.createdAt)}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </StyledCard>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          ) : isFreeTrial ? (
            <StyledCard>
              <CardContent sx={{ p: 4, textAlign: "center" }}>
                <WorkspacePremium sx={{ fontSize: 64, color: "info.main", mb: 2 }} />
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Free trial active
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {trialDaysRemaining != null
                    ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} remaining on your 30-day trial.`
                    : "Your organisation is on the 30-day free trial with full module access."}
                </Typography>
                <Chip label="FREE TRIAL" color="info" sx={{ fontWeight: 700 }} />
              </CardContent>
            </StyledCard>
          ) : (
            <StyledCard>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <WorkspacePremium sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  No plan assigned
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Please contact support to assign a plan
                </Typography>
              </CardContent>
            </StyledCard>
          )}
        </Box>
      )}

      {tabIndex === 4 && (
        <AdminSettingsTab
          onMessage={(message) =>
            setSnackbar({ open: true, message: message.text, severity: message.type })
          }
        />
      )}

      {tabIndex === BACKUP_TAB_INDEX && (
        <AdminBackupTab
          onMessage={(message) =>
            setSnackbar({ open: true, message: message.text, severity: message.type })
          }
        />
      )}

      {tabIndex === RECEIPT_TAB_INDEX && (
        <AdminReceiptDesignTab
          onMessage={(message) =>
            setSnackbar({ open: true, message: message.text, severity: message.type })
          }
        />
      )}

      {isOwner && tabIndex === LOCAL_USERS_TAB_INDEX && (
        <AdminLocalUsersTab
          onMessage={(message) =>
            setSnackbar({ open: true, message: message.text, severity: message.type })
          }
        />
      )}

      <Dialog open={paymentDialog.open} onClose={handleClosePaymentDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          Upgrade to {paymentDialog.plan?.name || 'Plan'}
        </DialogTitle>
        <DialogContent
          dividers
          sx={{
            background: (theme) => alpha(theme.palette.primary.light, 0.04),
            borderTop: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <Stack spacing={3} sx={{ mt: 1 }}>
            <PaymentHighlightCard>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 2 }}>
                    Selected Plan
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {paymentDialog.plan?.name || 'Plan'}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                    {paymentDialog.plan?.slug && (
                      <Chip
                        size="small"
                        label={paymentDialog.plan.slug.toUpperCase()}
                        color={getPlanColor(paymentDialog.plan.slug) as any}
                      />
                    )}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${paymentDialog.plan?.apiLimitMonthly?.toLocaleString() || '—'} API calls`}
                    />
                  </Stack>
                </Box>
                <Box textAlign={{ xs: 'left', sm: 'right' }}>
                  <Typography variant="overline" sx={{ letterSpacing: 2 }}>
                    Monthly Investment
                  </Typography>
                  <Typography variant="h3" fontWeight={800} color="primary.main">
                    {formatCurrencyValue(paymentDialog.plan?.priceMonthly, 'USD')}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Billed securely via PayNow
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {[
                  { icon: <Bolt fontSize="small" />, label: 'Instant upgrade' },
                  { icon: <TrendingUp fontSize="small" />, label: 'Unlock Pro modules' },
                  { icon: <Security fontSize="small" />, label: 'Secure PIN approval' },
                ].map((item) => (
                  <Chip
                    key={item.label}
                    icon={item.icon}
                    label={item.label}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 999 }}
                  />
                ))}
              </Stack>
            </PaymentHighlightCard>

            <PaymentInputCard>
              <Stack spacing={3}>
                <TextField label="Selected Plan" value={paymentDialog.plan?.name || ''} disabled fullWidth />
                <TextField
                  label="Amount (USD)"
                  value={(paymentDialog.plan?.priceMonthly ?? paymentForm.amount ?? 0).toString()}
                  disabled
                  fullWidth
                />
                
                {/* Payment Methods Info */}
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ mb: 2 }}>
                    Available Payment Methods
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { 
                        name: 'Visa/MasterCard', 
                        icon: <CreditCard />, 
                        color: '#1a1f71',
                        description: 'Credit & Debit Cards'
                      },
                      { 
                        name: 'EcoCash', 
                        icon: <AccountBalanceWallet />, 
                        color: '#00a651',
                        description: 'Mobile Money'
                      },
                      { 
                        name: 'Telecash', 
                        icon: <PhoneIphone />, 
                        color: '#e60012',
                        description: 'Mobile Money'
                      },
                      { 
                        name: 'OneMoney', 
                        icon: <Payment />, 
                        color: '#ff6b00',
                        description: 'Mobile Money'
                      },
                    ].map((method, index) => (
                      <Grid size={{ xs: 6, sm: 3 }} key={index}>
                        <Card
                          elevation={0}
                          sx={{
                            p: 2,
                            textAlign: 'center',
                            border: `1px solid ${alpha('#000', 0.1)}`,
                            borderRadius: 2,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              borderColor: method.color,
                              boxShadow: `0 4px 12px ${alpha(method.color, 0.2)}`,
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <Box
                            sx={{
                              color: method.color,
                              mb: 1,
                              display: 'flex',
                              justifyContent: 'center',
                            }}
                          >
                            {method.icon}
                          </Box>
                          <Typography variant="caption" fontWeight={600}>
                            {method.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            {method.description}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Optional Mobile Number Field */}
                <TextField
                  label="Mobile Number (Optional)"
                  placeholder="2637XXXXXXX - Only needed for mobile money"
                  value={paymentForm.msisdn}
                  onChange={(e) => handleMsisdnChange(e.target.value)}
                  fullWidth
                  inputMode="numeric"
                  inputProps={{ maxLength: 12 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIphone sx={{ color: 'primary.main', mr: 1 }} fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                  helperText="Optional: Enter mobile number if using EcoCash, Telecash, or OneMoney. Leave blank for card payments."
                />
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: alpha('#000', 0.02) }}>
                <Security sx={{ color: 'primary.main', mt: 0.5 }} fontSize="small" />
                <Box>
                  <Typography variant="body2" fontWeight={600} gutterBottom>
                    Secure Payment Processing
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    You'll be redirected to PayNow's secure payment page where you can choose your preferred payment method: 
                    Visa/MasterCard, EcoCash, Telecash, or OneMoney. All transactions are encrypted and secure.
                  </Typography>
                </Box>
              </Stack>
            </PaymentInputCard>
          </Stack>

          {paymentDialog.paymentId && (
            <Alert
              severity={activePayment?.status === 'completed' ? 'success' : 'info'}
              sx={{ mt: 3 }}
            >
              Transaction reference: <strong>{activePayment?.sourceReference}</strong>. Current status:{' '}
              <strong>{(activePayment?.status || 'pending').toUpperCase()}</strong>. Click "Check Status" after confirming
              the payment on your device.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleClosePaymentDialog} disabled={paymentLoading || checkingPayment}>
            Close
          </Button>
          {!paymentDialog.paymentId ? (
            <Button
              variant="contained"
              onClick={handleSubmitPlanPayment}
              disabled={paymentLoading}
              startIcon={!paymentLoading && <Payment />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {paymentLoading ? <CircularProgress size={20} /> : 'Continue to PayNow'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleCheckPlanPaymentStatus}
              disabled={checkingPayment}
            >
              {checkingPayment ? <CircularProgress size={20} /> : 'Check Status'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AdminShell>
  );
}
