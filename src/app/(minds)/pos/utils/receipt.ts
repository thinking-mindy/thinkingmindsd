import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import type { Receipt } from "../types";
import {
  buildReceiptDesignConfig,
  type ReceiptDesignConfig,
} from "@/lib/receipt-settings";
import { posTaxLabel } from "@/lib/pos-tax";

const escapeHtml = (unsafe: string) =>
  unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function formatReceiptDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export const buildReceiptHtml = async (
  receipt: Receipt,
  design: ReceiptDesignConfig = buildReceiptDesignConfig({})
) => {
  const { settings, branding } = design;
  const qrPayload = receipt.fiscal?.qrCodeUrl
    ?? JSON.stringify({ id: receipt.id, total: receipt.total });
  const qrDataUrl = settings.showQrCode
    ? await QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 200,
      })
    : "";

  const date = escapeHtml(formatReceiptDate(receipt.date));

  const itemsHtml = receipt.entries
    .map(
      (e) =>
        `<tr>
          <td style="padding:6px 8px; vertical-align: top;">${escapeHtml(e.item.name)} x ${e.qty}</td>
          <td style="padding:6px 8px; text-align:right; vertical-align: top;">$${(e.item.price * e.qty).toFixed(
            2
          )}</td>
        </tr>`
    )
    .join("");

  const change =
    receipt.payment.changeAmount ??
    (receipt.payment.method === "cash" && typeof receipt.payment.paidAmount === "number"
      ? Math.max(0, receipt.payment.paidAmount - receipt.total)
      : undefined);

  const paidRow =
    settings.showPaidAmount && typeof receipt.payment.paidAmount === "number"
      ? `<tr><td style="padding:6px 8px">Paid</td><td style="padding:6px 8px; text-align:right">$${receipt.payment.paidAmount.toFixed(
          2
        )}</td></tr>`
      : "";

  const changeRow =
    settings.showChange && change != null && change > 0
      ? `<tr><td style="padding:6px 8px; font-weight:700">Change</td><td style="padding:6px 8px; text-align:right; font-weight:700">$${change.toFixed(
          2
        )}</td></tr>`
      : "";

  const referenceRow =
    settings.showPaymentReference && receipt.payment.reference
      ? `<tr><td style="padding:6px 8px">Reference</td><td style="padding:6px 8px; text-align:right">${escapeHtml(
          receipt.payment.reference
        )}</td></tr>`
      : "";

  const paynowNumber = receipt.payment.paynowNumber || receipt.payment.ecocashNumber;
  const paynowRow =
    settings.showPaynowNumber && paynowNumber
      ? `<tr><td style="padding:6px 8px">PayNow</td><td style="padding:6px 8px; text-align:right">${escapeHtml(
          paynowNumber
        )}</td></tr>`
      : "";

  const cardRow =
    settings.showCardReference && receipt.payment.cardReference
      ? `<tr><td style="padding:6px 8px">Card Ref</td><td style="padding:6px 8px; text-align:right">${escapeHtml(
          receipt.payment.cardReference
        )}</td></tr>`
      : "";

  const logoBlock = settings.showLogo
    ? `<img src="${escapeHtml(branding.logoUrl)}" alt="logo" style="width:160px;height:auto;border-radius:4px;object-fit:contain;" onerror="this.src='/logo.png'" />`
    : "";

  const nameBlock = settings.showCompanyName
    ? `<h2 style="margin:0;font-size:18px;">${escapeHtml(branding.companyName)}</h2>`
    : "";

  const taglineBlock =
    settings.showTagline && branding.tagline
      ? `<div class="muted"><i>${escapeHtml(branding.tagline)}</i></div>`
      : "";

  const phoneBlock =
    settings.showPhone && branding.phone
      ? `<div class="muted">Phone: ${escapeHtml(branding.phone)}</div>`
      : "";

  const emailBlock =
    settings.showEmail && branding.email
      ? `<div class="muted">${escapeHtml(branding.email)}</div>`
      : "";

  const addressBlock =
    settings.showAddress && branding.address
      ? `<div class="muted">${escapeHtml(branding.address)}</div>`
      : "";

  const tableRow =
    settings.showTable && receipt.table
      ? `<div style="margin-top:8px;">Table: <strong>${escapeHtml(receipt.table)}</strong></div>`
      : "";

  const receiptIdRow = settings.showReceiptId
    ? `<div class="muted">Receipt ID: ${escapeHtml(receipt.id)}</div>`
    : "";

  const dateRow = settings.showDate ? `<div class="muted">Date: ${date}</div>` : "";

  const cashierRow = receipt.cashierName
    ? `<div class="muted">Cashier: ${escapeHtml(receipt.cashierName)}</div>`
    : "";

  const subtotalRow = settings.showSubtotal
    ? `<tr class="totals"><td>Subtotal</td><td style="text-align:right">$${receipt.subtotal.toFixed(2)}</td></tr>`
    : "";

  const taxRow = settings.showTax
    ? `<tr class="totals"><td>${escapeHtml(posTaxLabel())}</td><td style="text-align:right">$${receipt.tax.toFixed(2)}</td></tr>`
    : "";

  const fiscalBlock = receipt.fiscal
    ? `<div class="qr" style="margin-top:12px;font-size:12px;">
        <div><strong>Fiscal invoice</strong> · Day ${receipt.fiscal.fiscalDayNo}</div>
        <div class="muted">Verification: ${escapeHtml(receipt.fiscal.verificationCode ?? "—")}</div>
        <div class="muted">FDMS ID: ${receipt.fiscal.receiptId}</div>
      </div>`
    : "";

  const paymentMethodBlock = settings.showPaymentMethod
    ? `<div class="qr"><div class="totals">Paid using ${escapeHtml(receipt.payment.method)}</div></div>`
    : "";

  const qrBlock =
    settings.showQrCode && qrDataUrl
      ? `<div class="qr"><img src="${qrDataUrl}" alt="qr" style="width:120px;height:120px" /></div>`
      : "";

  const footerBlock = settings.showFooterMessage
    ? `<div style="text-align:center;margin-top:12px;color:#666;font-size:12px">${escapeHtml(
        branding.footerText
      )}</div>`
    : "";

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Receipt ${escapeHtml(receipt.id)}</title>
        <style>
          body { font-family: Arial, Helvetica, sans-serif; color:#000; padding:24px; background: #fff; }
          .header { text-align: center; }
          .merchant { display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
          .merchant .meta { text-align:left; flex:1; min-width:180px; }
          h2 { margin: 0; font-size: 18px; }
          .muted { color:#666; font-size:12px; }
          table { width:100%; border-collapse: collapse; margin-top:8px; }
          .items td { padding:6px 8px; }
          .totals td { padding:6px 8px; font-weight:bold; }
          .qr { text-align:center; margin-top:8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="merchant">
            ${logoBlock}
            <div class="meta">
              ${nameBlock}
              ${taglineBlock}
              ${phoneBlock}
              ${emailBlock}
              ${addressBlock}
              ${tableRow}
              ${receiptIdRow}
              ${dateRow}
              ${cashierRow}
            </div>
          </div>
        </div>

        <h2>Items:</h2>
        <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />

        <table class="items">
          ${itemsHtml}
        </table>

        <hr style="border:none;border-top:1px solid #ddd;margin:12px 0;" />

        <table style="width:100%;">
          ${subtotalRow}
          ${taxRow}
          <tr class="totals"><td>Total</td><td style="text-align:right">$${receipt.total.toFixed(2)}</td></tr>
          ${paidRow}
          ${changeRow}
          ${referenceRow}
          ${paynowRow}
          ${cardRow}
        </table>

        ${paymentMethodBlock}
        ${fiscalBlock}
        ${qrBlock}
        ${footerBlock}
      </body>
    </html>
  `;

  return html;
};

export const generateAndDownloadPdf = async (
  receipt: Receipt,
  design: ReceiptDesignConfig = buildReceiptDesignConfig({})
) => {
  const html = await buildReceiptHtml(receipt, design);

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "760px";
  container.style.background = "#fff";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = (pdf as any).getImageProperties(imgData);
    const imgWidthPx = imgProps.width;
    const imgHeightPx = imgProps.height;

    const margin = 8;
    const usablePageWidth = pageWidth - margin * 2;
    const ratio = usablePageWidth / imgWidthPx;
    const imgWidthMm = usablePageWidth;
    const imgHeightMm = imgHeightPx * ratio;

    if (imgHeightMm <= pageHeight - margin * 2) {
      pdf.addImage(imgData, "PNG", margin, margin, imgWidthMm, imgHeightMm);
    } else {
      let remainingHeightPx = imgHeightPx;
      const canvasPageHeightPx = Math.floor((pageHeight - margin * 2) / ratio);
      let yOffsetPx = 0;

      while (remainingHeightPx > 0) {
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = Math.min(canvasPageHeightPx, remainingHeightPx);
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, yOffsetPx, imgWidthPx, pageCanvas.height, 0, 0, imgWidthPx, pageCanvas.height);
        }

        const pageData = pageCanvas.toDataURL("image/png");
        const pageImgHeightMm = pageCanvas.height * ratio;

        if (yOffsetPx > 0) pdf.addPage();
        pdf.addImage(pageData, "PNG", margin, margin, imgWidthMm, pageImgHeightMm);

        remainingHeightPx -= pageCanvas.height;
        yOffsetPx += pageCanvas.height;
      }
    }

    pdf.save(`receipt-${receipt.id}.pdf`);
  } finally {
    try {
      container.remove();
    } catch {
      /* ignore */
    }
  }
};
