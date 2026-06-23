"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  alpha,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  AddOutlined,
  AttachMoneyOutlined,
  BusinessOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EmailOutlined,
  PeopleOutlined,
  PhoneOutlined,
  RefreshOutlined,
  TrendingUpOutlined,
} from "@mui/icons-material";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip as ChartTooltip,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { useUser } from "@/lib/auth/client";
import PlanGate from "@/components/PlanGate";
import {
  addDealToContact,
  createContact,
  deleteContact,
  deleteDealFromContact,
  getContactsForCurrentOrg,
  updateContact,
  updateDealOnContact,
} from "@/lib/desktop/crm-bridge";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, ChartTooltip, Legend);

const DEAL_STAGES = [
  { id: "lead", label: "Lead", color: "#9e9e9e" },
  { id: "qualified", label: "Qualified", color: "#2196f3" },
  { id: "proposal", label: "Proposal", color: "#ff9800" },
  { id: "negotiation", label: "Negotiation", color: "#f44336" },
  { id: "won", label: "Won", color: "#0AA775" },
  { id: "lost", label: "Lost", color: "#757575" },
] as const;

type DealRow = {
  dealId?: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  contactId?: string;
  contactName?: string;
  company?: string;
};

type ContactRow = {
  _id?: string;
  contactId?: string;
  name?: string;
  company?: string;
  emails?: string[];
  phones?: string[];
  deals?: DealRow[];
  createdAt?: string | Date;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string | Date) =>
  d ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d)) : "—";

function idStr(v?: string | { toString(): string }) {
  return v == null ? "" : String(v);
}

function stageLabel(stage?: string) {
  return DEAL_STAGES.find((s) => s.id === stage)?.label || stage || "—";
}

function stageColor(stage?: string): "default" | "info" | "warning" | "success" | "error" | "secondary" {
  switch (stage) {
    case "won":
      return "success";
    case "lost":
      return "default";
    case "negotiation":
      return "error";
    case "proposal":
      return "warning";
    case "qualified":
      return "info";
    default:
      return "secondary";
  }
}

function StatTile({
  label,
  value,
  sub,
  icon,
  color = "#0AA775",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2.5, height: "100%" }}>
      <CardContent sx={{ p: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(color, 0.12),
              color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CRMContent() {
  const { user } = useUser();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [contactDialog, setContactDialog] = useState<"create" | "edit" | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactRow | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
  });

  const [dealDialog, setDealDialog] = useState<"create" | "edit" | null>(null);
  const [selectedDeal, setSelectedDeal] = useState<DealRow | null>(null);
  const [dealForm, setDealForm] = useState({
    contactId: "",
    name: "",
    value: "",
    stage: "lead",
    probability: "25",
  });

  const load = useCallback(async () => {
    if (!user?.publicMetadata?.companyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getContactsForCurrentOrg();
      if (res.success) setContacts((res.data as unknown as ContactRow[]) || []);
    } catch {
      setSnackbar({ open: true, message: "Failed to load CRM data", severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [user?.publicMetadata?.companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const allDeals = useMemo(() => {
    const rows: DealRow[] = [];
    contacts.forEach((c) => {
      const cid = idStr(c.contactId || c._id);
      (c.deals || []).forEach((d) => {
        rows.push({
          ...d,
          dealId: idStr(d.dealId),
          contactId: cid,
          contactName: c.name,
          company: c.company,
        });
      });
    });
    return rows;
  }, [contacts]);

  const clients = useMemo(() => {
    const map = new Map<
      string,
      { company: string; contacts: number; deals: number; pipeline: number; won: number }
    >();
    contacts.forEach((c) => {
      const company = c.company?.trim() || "Independent";
      const entry = map.get(company) || { company, contacts: 0, deals: 0, pipeline: 0, won: 0 };
      entry.contacts += 1;
      (c.deals || []).forEach((d) => {
        entry.deals += 1;
        entry.pipeline += d.value || 0;
        if (d.stage === "won") entry.won += d.value || 0;
      });
      map.set(company, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.pipeline - a.pipeline);
  }, [contacts]);

  const kpis = useMemo(() => {
    const totalDeals = allDeals.length;
    const pipeline = allDeals.filter((d) => d.stage !== "won" && d.stage !== "lost").reduce((s, d) => s + (d.value || 0), 0);
    const wonValue = allDeals.filter((d) => d.stage === "won").reduce((s, d) => s + (d.value || 0), 0);
    const wonCount = allDeals.filter((d) => d.stage === "won").length;
    const winRate = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;
    return {
      contacts: contacts.length,
      clients: clients.length,
      deals: totalDeals,
      pipeline,
      wonValue,
      winRate,
    };
  }, [allDeals, clients.length, contacts.length]);

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.company?.toLowerCase().includes(q) ||
        c.emails?.some((e) => e.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  const filteredDeals = useMemo(() => {
    let list = allDeals;
    if (stageFilter !== "all") list = list.filter((d) => d.stage === stageFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.contactName?.toLowerCase().includes(q) ||
          d.company?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allDeals, search, stageFilter]);

  const stageChart = useMemo(() => {
    const buckets = DEAL_STAGES.map((s) => ({
      label: s.label,
      value: allDeals.filter((d) => d.stage === s.id).length,
      color: s.color,
    })).filter((b) => b.value > 0);
    return {
      labels: buckets.map((b) => b.label),
      datasets: [{ data: buckets.map((b) => b.value), backgroundColor: buckets.map((b) => b.color), borderWidth: 0 }],
    };
  }, [allDeals]);

  const clientChart = useMemo(() => {
    const rows = clients.slice(0, 8);
    return {
      labels: rows.map((r) => r.company),
      datasets: [
        {
          label: "Pipeline value",
          data: rows.map((r) => r.pipeline),
          backgroundColor: alpha("#0AA775", 0.75),
          borderRadius: 6,
        },
      ],
    };
  }, [clients]);

  const resetContactForm = () => setContactForm({ name: "", company: "", email: "", phone: "" });

  const resetDealForm = () =>
    setDealForm({ contactId: "", name: "", value: "", stage: "lead", probability: "25" });

  const saveContact = async () => {
    if (!user?.publicMetadata?.companyId || !contactForm.name.trim()) {
      setSnackbar({ open: true, message: "Contact name is required", severity: "error" });
      return;
    }
    const orgId = user.publicMetadata.companyId as string;
    const payload = {
      orgId,
      name: contactForm.name.trim(),
      company: contactForm.company.trim() || undefined,
      emails: contactForm.email.trim() ? [contactForm.email.trim()] : [],
      phones: contactForm.phone.trim() ? [contactForm.phone.trim()] : [],
    };

    const res =
      contactDialog === "edit" && selectedContact
        ? await updateContact(idStr(selectedContact.contactId || selectedContact._id), {
            name: payload.name,
            company: payload.company,
            emails: payload.emails,
            phones: payload.phones,
          })
        : await createContact(payload as never);

    if (res.success) {
      setSnackbar({
        open: true,
        message: contactDialog === "edit" ? "Contact updated" : "Contact created",
        severity: "success",
      });
      setContactDialog(null);
      setSelectedContact(null);
      resetContactForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const saveDeal = async () => {
    if (!dealForm.contactId || !dealForm.name.trim()) {
      setSnackbar({ open: true, message: "Contact and deal name are required", severity: "error" });
      return;
    }
    const dealPayload = {
      name: dealForm.name.trim(),
      value: Number(dealForm.value) || 0,
      stage: dealForm.stage,
      probability: Number(dealForm.probability) || 0,
    };

    const res =
      dealDialog === "edit" && selectedDeal?.dealId
        ? await updateDealOnContact(dealForm.contactId, selectedDeal.dealId, dealPayload)
        : await addDealToContact(dealForm.contactId, dealPayload);

    if (res.success) {
      setSnackbar({
        open: true,
        message: dealDialog === "edit" ? "Deal updated" : "Deal added",
        severity: "success",
      });
      setDealDialog(null);
      setSelectedDeal(null);
      resetDealForm();
      load();
    } else {
      setSnackbar({ open: true, message: (res as { error?: string }).error || "Save failed", severity: "error" });
    }
  };

  const removeContact = async (c: ContactRow) => {
    const res = await deleteContact(idStr(c.contactId || c._id));
    if (res.success) {
      setSnackbar({ open: true, message: "Contact deleted", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const removeDeal = async (d: DealRow) => {
    if (!d.contactId || !d.dealId) return;
    const res = await deleteDealFromContact(d.contactId, d.dealId);
    if (res.success) {
      setSnackbar({ open: true, message: "Deal removed", severity: "success" });
      load();
    } else {
      setSnackbar({ open: true, message: "Delete failed", severity: "error" });
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Contact", "Company", "Email", "Phone", "Deals", "Pipeline"],
      ...contacts.map((c) => {
        const deals = c.deals || [];
        const pipeline = deals.reduce((s, d) => s + (d.value || 0), 0);
        return [
          c.name || "",
          c.company || "",
          c.emails?.[0] || "",
          c.phones?.[0] || "",
          String(deals.length),
          String(pipeline),
        ];
      }),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crm-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%", py: 3, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Card
          variant="outlined"
          sx={(t) => ({
            borderRadius: 3,
            p: { xs: 2, md: 2.5 },
            borderColor: alpha(t.palette.primary.main, 0.25),
            bgcolor: alpha(t.palette.primary.main, 0.05),
          })}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="overline" color="text.secondary">
                Customer relationships
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                CRM & Clients
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Contacts, client accounts, and your sales pipeline in one place.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlined />}
                onClick={exportCsv}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Export CSV
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshOutlined />}
                onClick={load}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                Refresh
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PeopleOutlined />}
                onClick={() => {
                  resetContactForm();
                  setContactDialog("create");
                }}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                New contact
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddOutlined />}
                onClick={() => {
                  resetDealForm();
                  setDealDialog("create");
                }}
                sx={{ textTransform: "none", fontWeight: 700 }}
              >
                New deal
              </Button>
            </Stack>
          </Stack>
        </Card>

        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile label="Contacts" value={String(kpis.contacts)} icon={<PeopleOutlined sx={{ fontSize: 20 }} />} />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Clients"
              value={String(kpis.clients)}
              sub="Unique companies"
              icon={<BusinessOutlined sx={{ fontSize: 20 }} />}
              color="#2196f3"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Open pipeline"
              value={fmt(kpis.pipeline)}
              sub={`${kpis.deals} deals`}
              icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
              color="#ff9800"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Won revenue"
              value={fmt(kpis.wonValue)}
              icon={<AttachMoneyOutlined sx={{ fontSize: 20 }} />}
              color="#0AA775"
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 4, md: 2.4 }}>
            <StatTile
              label="Win rate"
              value={`${kpis.winRate}%`}
              icon={<TrendingUpOutlined sx={{ fontSize: 20 }} />}
              color="#9c27b0"
            />
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 600, minHeight: 42 } }}
        >
          <Tab label="Overview" />
          <Tab label={`Contacts (${contacts.length})`} />
          <Tab label={`Clients (${clients.length})`} />
          <Tab label={`Pipeline (${allDeals.length})`} />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Deals by stage
                </Typography>
                <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {stageChart.labels.length ? (
                    <Doughnut
                      data={stageChart}
                      options={{ plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No deals yet — add a deal to your pipeline.
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Pipeline by client
                </Typography>
                <Box sx={{ height: 260 }}>
                  {clientChart.labels.length ? (
                    <Bar
                      data={clientChart}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { ticks: { callback: (v) => fmt(Number(v)) } } },
                      }}
                    />
                  ) : (
                    <Stack alignItems="center" justifyContent="center" sx={{ height: "100%" }}>
                      <Typography variant="body2" color="text.secondary">
                        Add contacts with companies to see client pipeline.
                      </Typography>
                    </Stack>
                  )}
                </Box>
              </Card>
            </Grid>
          </Grid>
        )}

        {tab === 1 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <TextField
                size="small"
                placeholder="Search contacts…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
              />
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell align="right">Deals</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredContacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No contacts yet.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContacts.map((c) => {
                    const cid = idStr(c.contactId || c._id);
                    return (
                      <TableRow key={cid} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                        <TableCell>{c.company || "—"}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {c.emails?.[0] ? (
                              <>
                                <EmailOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
                                <Typography variant="body2">{c.emails[0]}</Typography>
                              </>
                            ) : (
                              "—"
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {c.phones?.[0] ? (
                              <>
                                <PhoneOutlined sx={{ fontSize: 14, color: "text.secondary" }} />
                                <Typography variant="body2">{c.phones[0]}</Typography>
                              </>
                            ) : (
                              "—"
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell align="right">{c.deals?.length || 0}</TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                            <Tooltip title="Add deal">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  resetDealForm();
                                  setDealForm((f) => ({ ...f, contactId: cid }));
                                  setDealDialog("create");
                                }}
                              >
                                <AddOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setSelectedContact(c);
                                  setContactForm({
                                    name: c.name || "",
                                    company: c.company || "",
                                    email: c.emails?.[0] || "",
                                    phone: c.phones?.[0] || "",
                                  });
                                  setContactDialog("edit");
                                }}
                              >
                                <EditOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => removeContact(c)}>
                                <DeleteOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 2 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Client / company</TableCell>
                  <TableCell align="right">Contacts</TableCell>
                  <TableCell align="right">Deals</TableCell>
                  <TableCell align="right">Pipeline</TableCell>
                  <TableCell align="right">Won</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No client accounts yet. Add contacts with a company name.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.company} hover>
                      <TableCell sx={{ fontWeight: 600 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <BusinessOutlined sx={{ fontSize: 18, color: "text.secondary" }} />
                          <span>{client.company}</span>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">{client.contacts}</TableCell>
                      <TableCell align="right">{client.deals}</TableCell>
                      <TableCell align="right">{fmt(client.pipeline)}</TableCell>
                      <TableCell align="right">{fmt(client.won)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}

        {tab === 3 && (
          <Card variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  placeholder="Search deals…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Stage</InputLabel>
                  <Select label="Stage" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
                    <MenuItem value="all">All stages</MenuItem>
                    {DEAL_STAGES.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Deal</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Client</TableCell>
                  <TableCell>Stage</TableCell>
                  <TableCell align="right">Value</TableCell>
                  <TableCell align="right">Probability</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredDeals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">No deals in the pipeline.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeals.map((d) => (
                    <TableRow key={`${d.contactId}-${d.dealId}`} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{d.name}</TableCell>
                      <TableCell>{d.contactName || "—"}</TableCell>
                      <TableCell>{d.company || "—"}</TableCell>
                      <TableCell>
                        <Chip label={stageLabel(d.stage)} size="small" color={stageColor(d.stage)} variant="outlined" />
                      </TableCell>
                      <TableCell align="right">{fmt(d.value || 0)}</TableCell>
                      <TableCell align="right">{d.probability ?? 0}%</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedDeal(d);
                                setDealForm({
                                  contactId: d.contactId || "",
                                  name: d.name,
                                  value: String(d.value || 0),
                                  stage: d.stage,
                                  probability: String(d.probability ?? 0),
                                });
                                setDealDialog("edit");
                              }}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => removeDeal(d)}>
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </Stack>

      <Dialog open={!!contactDialog} onClose={() => setContactDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{contactDialog === "edit" ? "Edit contact" : "New contact"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              size="small"
              value={contactForm.name}
              onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Company"
              size="small"
              value={contactForm.company}
              onChange={(e) => setContactForm((f) => ({ ...f, company: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Email"
              size="small"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Phone"
              size="small"
              value={contactForm.phone}
              onChange={(e) => setContactForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setContactDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveContact}>
            {contactDialog === "edit" ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!dealDialog} onClose={() => setDealDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{dealDialog === "edit" ? "Edit deal" : "New deal"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl size="small" fullWidth>
              <InputLabel>Contact</InputLabel>
              <Select
                label="Contact"
                value={dealForm.contactId}
                onChange={(e: SelectChangeEvent) => setDealForm((f) => ({ ...f, contactId: e.target.value }))}
                disabled={dealDialog === "edit"}
              >
                {contacts.map((c) => {
                  const cid = idStr(c.contactId || c._id);
                  return (
                    <MenuItem key={cid} value={cid}>
                      {c.name}
                      {c.company ? ` · ${c.company}` : ""}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <TextField
              label="Deal name"
              size="small"
              value={dealForm.name}
              onChange={(e) => setDealForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Value (USD)"
              size="small"
              type="number"
              value={dealForm.value}
              onChange={(e) => setDealForm((f) => ({ ...f, value: e.target.value }))}
              fullWidth
            />
            <Stack direction="row" spacing={1.5}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Stage</InputLabel>
                <Select
                  label="Stage"
                  value={dealForm.stage}
                  onChange={(e: SelectChangeEvent) => setDealForm((f) => ({ ...f, stage: e.target.value }))}
                >
                  {DEAL_STAGES.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Probability %"
                size="small"
                type="number"
                value={dealForm.probability}
                onChange={(e) => setDealForm((f) => ({ ...f, probability: e.target.value }))}
                sx={{ flex: 1 }}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDealDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveDeal}>
            {dealDialog === "edit" ? "Save" : "Add deal"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function CRMPage() {
  return (
    <PlanGate modulePath="/crm" moduleName="CRM">
      <CRMContent />
    </PlanGate>
  );
}
