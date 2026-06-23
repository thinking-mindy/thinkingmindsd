"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Stack,
  alpha,
  useTheme,
  LinearProgress,
  Avatar,
  IconButton,
  TextField,
  Divider,
} from "@mui/material";
import {
  Support,
  Add,
  Refresh,
  Warning,
  CheckCircle,
  Schedule,
  TrendingUp,
  Close,
} from "@mui/icons-material";
import { FlatCard, statIconSx } from "@/components/FlatCard";
import PlanGate from "@/components/PlanGate";
import { useUser } from "@/lib/auth/client";
import { memberDisplayName } from "@/lib/member-display";
import { getTicketsByOrg } from "@/lib/desktop/helpdesk-bridge";
import {
  getArticlesByOrg,
  searchArticles,
} from "@/lib/desktop/knowledge-base-bridge";
import { getUserRequestsByOrg } from "@/lib/desktop/user-requests-bridge";

// Support Tickets component
function SupportTickets() {
  const theme = useTheme();
  const { user } = useUser();
  const [value, setValue] = useState(0);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  });
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchTickets = async () => {
      if (!orgId) return;
      try {
        setLoading(true);
        const response = await getTicketsByOrg(orgId);
        if (response.success && response.data) {
          const ticketsData = response.data || [];
          setTickets(ticketsData);
          setStats({
            total: ticketsData.length,
            open: ticketsData.filter((t: any) => t.status === "open").length,
            inProgress: ticketsData.filter((t: any) => t.status === "in_progress").length,
            resolved: ticketsData.filter((t: any) => 
              t.status === "resolved" || t.status === "closed"
            ).length,
          });
        }
      } catch (error) {
        console.error("Error fetching tickets:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [orgId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return theme.palette.error.main;
      case "in_progress":
        return theme.palette.warning.main;
      case "resolved":
      case "closed":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return theme.palette.error.main;
      case "high":
        return theme.palette.warning.main;
      case "medium":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const filteredTickets = 
    value === 0 ? tickets :
    value === 1 ? tickets.filter((t: any) => t.status === "open") :
    value === 2 ? tickets.filter((t: any) => t.status === "in_progress") :
    tickets.filter((t: any) => t.status === "resolved" || t.status === "closed");

  return (
    <Box sx={{ pt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Support Tickets
          </Typography>
          <Typography color="text.secondary">
            Manage support tickets, escalations, and track resolution metrics.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          New Ticket
        </Button>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Total Tickets
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="text.primary">
                    {stats.total}
                  </Typography>
                </Box>
                <Box sx={statIconSx('neutral')}>
                  <Support sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Open
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="error.main">
                    {stats.open}
                  </Typography>
                </Box>
                <Box sx={statIconSx('danger')}>
                  <Warning sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    In Progress
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {stats.inProgress}
                  </Typography>
                </Box>
                <Box sx={statIconSx('warning')}>
                  <Schedule sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Resolved
                  </Typography>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {stats.resolved}
                  </Typography>
                </Box>
                <Box sx={statIconSx('safe')}>
                  <CheckCircle sx={{ fontSize: 22 }} />
                </Box>
              </Stack>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        <Tab label="All Tickets" />
        <Tab label="Open" />
        <Tab label="In Progress" />
        <Tab label="Resolved" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
          {filteredTickets.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Support sx={{ fontSize: 64, color: "text.secondary", mb: 2, opacity: 0.5 }} />
                  <Typography variant="h6" color="text.secondary">
                    No tickets found
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            filteredTickets.map((ticket) => (
              <Grid size={{ xs: 12, md: 6 }} key={ticket.ticketId || ticket._id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Typography variant="h6" fontWeight={700}>
                          {ticket.subject || "Untitled Ticket"}
                        </Typography>
                        <Chip
                          label={ticket.status?.replace("_", " ").toUpperCase() || "OPEN"}
                          size="small"
                          sx={{
                            backgroundColor: alpha(getStatusColor(ticket.status || "open"), 0.15),
                            color: getStatusColor(ticket.status || "open"),
                            fontWeight: 700,
                            border: `1px solid ${alpha(getStatusColor(ticket.status || "open"), 0.3)}`,
                          }}
                        />
                      </Stack>
                      <Chip
                        label={ticket.priority?.toUpperCase() || "MEDIUM"}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getPriorityColor(ticket.priority || "medium"), 0.15),
                          color: getPriorityColor(ticket.priority || "medium"),
                          fontWeight: 600,
                          width: "fit-content",
                        }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {ticket.messages?.[0]?.message || "No description"}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </Typography>
                        {ticket.assignedTo && (
                          <Chip label="Assigned" size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  );
}

// Knowledge Base component
function KnowledgeBase() {
  const theme = useTheme();
  const { user } = useUser();
  const [value, setValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(["All"]);
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchArticles = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        let response;
        if (searchQuery) {
          response = await searchArticles(orgId, searchQuery);
        } else {
          response = await getArticlesByOrg(orgId);
        }

        if (response.success && response.data) {
          const articlesData = response.data || [];
          setArticles(articlesData);
          
          // Extract unique categories
          const uniqueCategories = ["All", ...Array.from(new Set(articlesData.map((a: any) => a.category).filter(Boolean)))];
          setCategories(uniqueCategories);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [orgId, searchQuery]);

  const filteredArticles = value === 0
    ? articles
    : articles.filter((article) => article.category === categories[value]);

  return (
    <Box sx={{ pt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Knowledge Base
          </Typography>
          <Typography color="text.secondary">
            Articles, FAQs, and documentation for quick issue resolution.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
        >
          New Article
        </Button>
      </Stack>

      {/* Search Bar */}
      <Card elevation={0} sx={{ mb: 3, borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </CardContent>
      </Card>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        {categories.map((category) => (
          <Tab key={category} label={category} />
        ))}
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={3}>
          {filteredArticles.length === 0 ? (
            <Grid size={{ xs: 12 }}>
              <Card>
                <CardContent sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No articles found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery ? "Try a different search term" : "No articles in this category"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ) : (
            filteredArticles.map((article) => (
              <Grid size={{ xs: 12, md: 6 }} key={article._id || article.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    transition: "all 0.3s ease",
                    height: "100%",
                    "&:hover": {
                      boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                      transform: "translateY(-2px)",
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                    },
                  }}
                >
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" fontWeight={700} gutterBottom>
                            {article.title}
                          </Typography>
                          {article.category && (
                            <Chip
                              label={article.category}
                              size="small"
                              sx={{
                                backgroundColor: alpha(theme.palette.primary.main, 0.15),
                                color: theme.palette.primary.main,
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ minHeight: 60 }}>
                        {article.content}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          {article.views || 0} views
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          •
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Updated {article.lastUpdated ? new Date(article.lastUpdated).toLocaleDateString() : article.updatedAt ? new Date(article.updatedAt).toLocaleDateString() : "N/A"}
                        </Typography>
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      )}
    </Box>
  );
}

// User Requests component
function UserRequests() {
  const theme = useTheme();
  const { user } = useUser();
  const [value, setValue] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const orgId = (user?.publicMetadata?.companyId as string) || "";

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const fetchRequests = async () => {
      if (!orgId) return;
      setLoading(true);
      try {
        // Fetch user requests and users
        const [requestsRes, usersRes] = await Promise.all([
          getUserRequestsByOrg(orgId),
          import("@/lib/desktop/users-bridge").then(m => m.getMembers()),
        ]);

        const requestsData = requestsRes.success && requestsRes.data ? requestsRes.data : [];
        const users = usersRes.aye && Array.isArray(usersRes.aye) ? usersRes.aye : [];

        // Map requests with user information
        const mappedRequests = requestsData.map((req: any) => {
          const user = users.find((u: any) => {
            const reqUserId = typeof req.userId === 'string' ? req.userId : req.userId?.toString();
            return u._id === req.userId || 
                   u.id === req.userId || 
                   u._id?.toString() === reqUserId ||
                   u.id === reqUserId;
          });

          return {
            requestId: req._id?.toString() || req.requestId || "N/A",
            user: user ? memberDisplayName(user) : "Unknown User",
            userEmail:
              req.userEmail ||
              (user as { email?: string; emailAddresses?: { emailAddress?: string }[] })?.email ||
              (user as { emailAddresses?: { emailAddress?: string }[] })?.emailAddresses?.[0]
                ?.emailAddress ||
              "N/A",
            issue: req.issue || "Untitled Request",
            status: req.status || "Pending",
            priority: req.priority || "medium",
            createdAt: req.createdAt ? new Date(req.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            completedAt: req.completedAt ? new Date(req.completedAt).toISOString().split("T")[0] : undefined,
            description: req.description || "No description provided",
            category: req.category || "General",
            _id: req._id,
          };
        });

        setRequests(mappedRequests);
        setStats({
          total: mappedRequests.length,
          pending: mappedRequests.filter((r) => r.status === "Pending").length,
          inProgress: mappedRequests.filter((r) => r.status === "In Progress").length,
          completed: mappedRequests.filter((r) => r.status === "Completed").length,
        });
      } catch (error) {
        console.error("Error fetching user requests:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [orgId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return theme.palette.warning.main;
      case "In Progress":
        return theme.palette.info.main;
      case "Completed":
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return theme.palette.error.main;
      case "high":
        return theme.palette.warning.main;
      case "medium":
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const filteredRequests = 
    value === 0 ? requests :
    value === 1 ? requests.filter((r) => r.status === "Pending") :
    value === 2 ? requests.filter((r) => r.status === "In Progress") :
    requests.filter((r) => r.status === "Completed");

  return (
    <Box sx={{ pt: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            User Requests
          </Typography>
          <Typography color="text.secondary">
            View and manage user requests for support, resources, and access.
          </Typography>
        </Box>
      </Stack>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Requests
              </Typography>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                {stats.total}
              </Typography>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Pending
              </Typography>
              <Typography variant="h4" fontWeight={700} color="warning.main">
                {stats.pending}
              </Typography>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                In Progress
              </Typography>
              <Typography variant="h4" fontWeight={700} color="text.primary">
                {stats.inProgress}
              </Typography>
            </CardContent>
          </FlatCard>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FlatCard>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {stats.completed}
              </Typography>
            </CardContent>
          </FlatCard>
        </Grid>
      </Grid>

      <Tabs
        value={value}
        onChange={handleChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 3,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
          },
        }}
      >
        <Tab label="All Requests" />
        <Tab label="Pending" />
        <Tab label="In Progress" />
        <Tab label="Completed" />
      </Tabs>

      {loading ? (
        <LinearProgress />
      ) : (
        <Grid container spacing={2}>
        {filteredRequests.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent sx={{ textAlign: "center", py: 6 }}>
                <Typography variant="h6" color="text.secondary">
                  No requests found
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ) : (
          filteredRequests.map((req) => (
            <Grid size={{ xs: 12, md: 6 }} key={req.requestId}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                    transform: "translateY(-2px)",
                    borderColor: alpha(theme.palette.primary.main, 0.3),
                  },
                }}
                onClick={() => setSelectedRequest(req)}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={700} gutterBottom>
                          {req.issue}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {req.user} • {req.userEmail}
                        </Typography>
                      </Box>
                      <Chip
                        label={req.status}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getStatusColor(req.status), 0.15),
                          color: getStatusColor(req.status),
                          fontWeight: 700,
                          border: `1px solid ${alpha(getStatusColor(req.status), 0.3)}`,
                        }}
                      />
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Chip
                        label={req.priority?.toUpperCase() || "MEDIUM"}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getPriorityColor(req.priority || "medium"), 0.15),
                          color: getPriorityColor(req.priority || "medium"),
                          fontWeight: 600,
                        }}
                      />
                      <Chip
                        label={req.category}
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}>
                      {req.description}
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Typography variant="caption" color="text.secondary">
                        Created: {req.createdAt}
                      </Typography>
                      {req.completedAt && (
                        <>
                          <Typography variant="caption" color="text.secondary">•</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Completed: {req.completedAt}
                          </Typography>
                        </>
                      )}
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>
      )}

      {/* Request Details Dialog */}
      {selectedRequest && (
        <Card
          elevation={0}
          sx={{
            mt: 3,
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            backgroundColor: alpha(theme.palette.primary.main, 0.05),
          }}
        >
          <CardContent>
            <Stack spacing={3}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="h5" fontWeight={700}>
                  Request Details
                </Typography>
                <IconButton size="small" onClick={() => setSelectedRequest(null)}>
                  <Close />
                </IconButton>
              </Stack>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Request ID
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedRequest.requestId}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip
                    label={selectedRequest.status}
                    sx={{
                      backgroundColor: alpha(getStatusColor(selectedRequest.status), 0.15),
                      color: getStatusColor(selectedRequest.status),
                      fontWeight: 700,
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    User
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedRequest.user}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedRequest.userEmail}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Category
                  </Typography>
                  <Chip label={selectedRequest.category} variant="outlined" />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body1">
                    {selectedRequest.description}
                  </Typography>
                </Grid>
              </Grid>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

// Main Dashboard for Helpdesk
function HelpdeskDashboard() {
  const theme = useTheme();
  const { user } = useUser();
  const [mainTab, setMainTab] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleMainTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setMainTab(newValue);
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <Box sx={{ width: "100%", py: 2 }}>
      {/* Header Section */}
      <FlatCard sx={{ mb: 4, p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
              <Avatar
                sx={{
                  backgroundColor: theme.palette.primary.main,
                  width: 56,
                  height: 56,
                  boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.3)}`,
                }}
              >
                <Support sx={{ fontSize: 28 }} />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
                  Helpdesk & Support
                </Typography>
                <Typography color="text.secondary" fontWeight={500}>
                  Manage support tickets, knowledge base, and user requests.
                </Typography>
              </Box>
            </Stack>
          </Box>
          <IconButton
            onClick={handleRefresh}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
                transform: "rotate(180deg)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <Refresh />
          </IconButton>
        </Stack>
      </FlatCard>

      {/* Main Navigation Tabs */}
      <Tabs
        value={mainTab}
        onChange={handleMainTabChange}
        textColor="primary"
        indicatorColor="primary"
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 4,
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.95rem",
            minHeight: 48,
            borderRadius: 2,
            mx: 0.5,
            "&.Mui-selected": {
              color: theme.palette.primary.main,
            },
          },
          "& .MuiTabs-indicator": {
            height: 3,
            borderRadius: 2,
          },
        }}
      >
        <Tab icon={<Support sx={{ mr: 1 }} />} iconPosition="start" label="Support Tickets" />
        <Tab icon={<CheckCircle sx={{ mr: 1 }} />} iconPosition="start" label="Knowledge Base" />
        <Tab icon={<Schedule sx={{ mr: 1 }} />} iconPosition="start" label="User Requests" />
      </Tabs>

      {/* Render selected section */}
      {mainTab === 0 && <SupportTickets key={`tickets-${refreshKey}`} />}
      {mainTab === 1 && <KnowledgeBase key={`kb-${refreshKey}`} />}
      {mainTab === 2 && <UserRequests key={`requests-${refreshKey}`} />}
    </Box>
  );
}

export default function HelpdeskPage() {
  return (
    <PlanGate modulePath="/helpdesk" moduleName="Helpdesk">
      <HelpdeskDashboard />
    </PlanGate>
  );
}