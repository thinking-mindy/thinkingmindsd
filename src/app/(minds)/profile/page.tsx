"use client";

import { useState } from "react";
import { Alert, Box, Snackbar, Typography } from "@mui/material";
import UserProfileForm from "@/components/UserProfileForm";

export default function ProfilePage() {
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  return (
    <Box sx={{ width: "100%", maxWidth: 900, mx: "auto", py: { xs: 2, md: 3 }, px: { xs: 2, md: 3 } }}>
      <Typography variant="h4" fontWeight={800} gutterBottom>
        Profile
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage your personal account details for this device.
      </Typography>

      <UserProfileForm
        onMessage={(message) =>
          setSnackbar({ open: true, message: message.text, severity: message.type })
        }
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
