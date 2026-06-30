"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Divider,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  alpha,
  styled,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import { Receipt } from "../types";
import QRCode from "qrcode";
import {
  buildReceiptDesignConfig,
  type ReceiptDesignConfig,
} from "@/lib/receipt-settings";
import { posTaxLabel } from "@/lib/pos-tax";
import { useReceiptDesign } from "@/hooks/useReceiptDesign";

const ReceiptContainer = styled(Paper)(({ theme }) => ({
  maxWidth: 400,
  margin: "0 auto",
  padding: theme.spacing(3),
  backgroundColor: "#fff",
  color: "#000",
  "@media print": {
    boxShadow: "none",
    margin: 0,
    padding: theme.spacing(2),
    maxWidth: "100%",
  },
}));

const PrintActions = styled(Box)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(2),
  justifyContent: "center",
  marginTop: theme.spacing(3),
  "@media print": {
    display: "none",
  },
}));

interface ReceiptPreviewProps {
  receipt: Receipt;
  onClose?: () => void;
  /** When provided (e.g. admin preview), skips loading from server */
  design?: ReceiptDesignConfig;
}

function receiptChange(receipt: Receipt): number | undefined {
  const stored = receipt.payment.changeAmount;
  if (stored != null) return stored > 0 ? stored : undefined;
  if (receipt.payment.method !== "cash" || typeof receipt.payment.paidAmount !== "number") return undefined;
  const diff = receipt.payment.paidAmount - receipt.total;
  return diff > 0 ? diff : undefined;
}

export default function ReceiptPreview({ receipt, onClose, design }: ReceiptPreviewProps) {
  const { config: loadedConfig } = useReceiptDesign();
  const config = design ?? loadedConfig ?? buildReceiptDesignConfig({});
  const { settings, branding } = config;

  const change = receiptChange(receipt);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  useEffect(() => {
    if (!settings.showQrCode) {
      setQrDataUrl("");
      return;
    }
    const generateQR = async () => {
      try {
        const qrPayload = receipt.fiscal?.qrCodeUrl
          ?? JSON.stringify({ id: receipt.id, total: receipt.total });
        const dataUrl = await QRCode.toDataURL(qrPayload, { margin: 1, width: 150 });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
    };
    void generateQR();
  }, [receipt.id, receipt.total, receipt.fiscal?.qrCodeUrl, settings.showQrCode]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .receipt-print-area,
        .receipt-print-area * {
          visibility: visible;
        }
        .receipt-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const showHeaderBlock =
    settings.showLogo ||
    settings.showCompanyName ||
    settings.showTagline ||
    settings.showPhone ||
    settings.showEmail ||
    settings.showAddress ||
    settings.showTable ||
    settings.showReceiptId ||
    settings.showDate;

  return (
    <Box className="receipt-print-area">
      <ReceiptContainer>
        {showHeaderBlock && (
          <Box sx={{ textAlign: "center", mb: 3 }}>
            {settings.showLogo && (
              <Box sx={{ mb: 1.5, display: "flex", justifyContent: "center" }}>
                <Box
                  component="img"
                  src={branding.logoUrl}
                  alt={branding.companyName}
                  sx={{
                    maxWidth: 160,
                    maxHeight: 80,
                    objectFit: "contain",
                    borderRadius: 1,
                    "@media print": { maxWidth: 140 },
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
              </Box>
            )}
            {settings.showCompanyName && (
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 0.5,
                  color: "#000",
                  "@media print": { color: "#000" },
                }}
              >
                {branding.companyName}
              </Typography>
            )}
            {settings.showTagline && branding.tagline && (
              <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                {branding.tagline}
              </Typography>
            )}
            {settings.showPhone && branding.phone && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                Phone: {branding.phone}
              </Typography>
            )}
            {settings.showEmail && branding.email && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {branding.email}
              </Typography>
            )}
            {settings.showAddress && branding.address && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {branding.address}
              </Typography>
            )}
            {settings.showTable && receipt.table && (
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
                Table: {receipt.table}
              </Typography>
            )}
            {settings.showReceiptId && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1 }}>
                Receipt ID: {receipt.id}
              </Typography>
            )}
            {settings.showDate && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Date: {formatDate(receipt.date)}
              </Typography>
            )}
            {receipt.cashierName && (
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                Cashier: {receipt.cashierName}
              </Typography>
            )}
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1.5 }}>
          Items:
        </Typography>
        <Table size="small">
          <TableBody>
            {receipt.entries.map((entry, index) => (
              <TableRow key={index}>
                <TableCell sx={{ border: "none", py: 1, px: 0 }}>
                  <Typography variant="body2">
                    {entry.item.name} × {entry.qty}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 1, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ${(entry.item.price * entry.qty).toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Divider sx={{ my: 2 }} />

        <Table size="small">
          <TableBody>
            {settings.showSubtotal && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">Subtotal</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ${receipt.subtotal.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {settings.showTax && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">{posTaxLabel()}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ${receipt.tax.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            <TableRow>
              <TableCell sx={{ border: "none", py: 1, px: 0 }}>
                <Typography variant="h6" fontWeight={700}>
                  Total
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ border: "none", py: 1, px: 0 }}>
                <Typography variant="h6" fontWeight={700}>
                  ${receipt.total.toFixed(2)}
                </Typography>
              </TableCell>
            </TableRow>
            {settings.showPaidAmount && typeof receipt.payment.paidAmount === "number" && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">Paid</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    ${receipt.payment.paidAmount.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {receipt.schoolFee && receipt.schoolFee.termFeesTotal > 0 && (
              <TableRow>
                <TableCell colSpan={2} sx={{ border: "none", py: 1.5, px: 0 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      border: "1px dashed #bdbdbd",
                      bgcolor: "#fafafa",
                    }}
                  >
                    <Typography variant="caption" fontWeight={800} sx={{ display: "block", letterSpacing: 0.5 }}>
                      TERM FEE STATEMENT · {receipt.schoolFee.termLabel}
                    </Typography>
                    {receipt.schoolFee.studentName && (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "text.secondary" }}>
                        {receipt.schoolFee.studentName}
                        {receipt.schoolFee.studentNumber ? ` · ${receipt.schoolFee.studentNumber}` : ""}
                        {receipt.schoolFee.className ? ` · ${receipt.schoolFee.className}` : ""}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.25 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption">Term fees</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          ${receipt.schoolFee.termFeesTotal.toFixed(2)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                        <Typography variant="caption">Paid this term</Typography>
                        <Typography variant="caption" fontWeight={700}>
                          ${receipt.schoolFee.paidThisTerm.toFixed(2)}
                        </Typography>
                      </Stack>
                      <Box
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          bgcolor: "#e0e0e0",
                          overflow: "hidden",
                          my: 1,
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            width: `${receipt.schoolFee.percentPaid}%`,
                            bgcolor: receipt.schoolFee.remainingBalance <= 0 ? "#2e7d32" : "#1976d2",
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight={800}>
                          Remaining balance
                        </Typography>
                        <Typography
                          variant="body1"
                          fontWeight={800}
                          sx={{ color: receipt.schoolFee.remainingBalance > 0 ? "#c62828" : "#2e7d32" }}
                        >
                          ${receipt.schoolFee.remainingBalance.toFixed(2)}
                        </Typography>
                      </Stack>
                      {receipt.schoolFee.remainingBalance <= 0 && (
                        <Typography variant="caption" sx={{ color: "#2e7d32", fontWeight: 700, mt: 0.5, display: "block" }}>
                          Term fees fully paid — thank you!
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            )}
            {settings.showChange && change != null && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={700}>
                    Change
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body1" fontWeight={800} color="success.main">
                    ${change.toFixed(2)}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {settings.showPaymentReference && receipt.payment.reference && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">Reference</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {receipt.payment.reference}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {settings.showPaynowNumber && (receipt.payment.paynowNumber || receipt.payment.ecocashNumber) && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">PayNow</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {receipt.payment.paynowNumber || receipt.payment.ecocashNumber}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {settings.showCardReference && receipt.payment.cardReference && (
              <TableRow>
                <TableCell sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2">Card Ref</Typography>
                </TableCell>
                <TableCell align="right" sx={{ border: "none", py: 0.5, px: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {receipt.payment.cardReference}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {settings.showPaymentMethod && (
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" fontWeight={600} sx={{ textTransform: "capitalize" }}>
              Paid using {receipt.payment.method}
            </Typography>
          </Box>
        )}

        {receipt.fiscal && (
          <Box sx={{ textAlign: "center", mt: 2, p: 1.5, borderRadius: 1.5, bgcolor: "action.hover" }}>
            <Typography variant="caption" fontWeight={700} sx={{ display: "block", letterSpacing: 0.5 }}>
              ZIMRA FISCAL RECEIPT
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              Fiscal day {receipt.fiscal.fiscalDayNo} · #{receipt.fiscal.receiptGlobalNo}
            </Typography>
            {receipt.fiscal.verificationCode && (
              <Typography variant="body2" fontWeight={600} sx={{ mt: 0.5 }}>
                {receipt.fiscal.verificationCode}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              FDMS receipt ID: {receipt.fiscal.receiptId}
            </Typography>
          </Box>
        )}

        {settings.showQrCode && qrDataUrl && (
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <img
              src={qrDataUrl}
              alt={receipt.fiscal ? "ZIMRA verification QR" : "QR Code"}
              style={{ width: 120, height: 120, display: "block", margin: "0 auto" }}
            />
          </Box>
        )}

        {settings.showFooterMessage && (
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {branding.footerText}
            </Typography>
          </Box>
        )}

        {onClose && (
          <PrintActions>
            <Button
              variant="contained"
              startIcon={<PrintIcon />}
              onClick={handlePrint}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              Print Receipt
            </Button>
            <Button
              variant="outlined"
              startIcon={<CloseIcon />}
              onClick={onClose}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 3,
              }}
            >
              Close
            </Button>
          </PrintActions>
        )}
      </ReceiptContainer>
    </Box>
  );
}
