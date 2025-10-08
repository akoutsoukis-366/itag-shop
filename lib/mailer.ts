// lib/mailer.ts
import nodemailer from "nodemailer";
import { renderTemplate } from "@/lib/template";

export function makeTransport() {
  const verbose = process.env.MAIL_VERBOSE === "1"; // toggle if needed
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    logger: verbose ? true : false,
    debug: verbose ? true : false,
  });
}

export async function sendShippedEmail(
  to: string,
  data: { carrier?: string | null; trackingNumber?: string | null; trackingUrl?: string | null; orderId: string }
) {
  const transporter = makeTransport();

  const vars = {
    orderId: data.orderId,
    carrier: data.carrier ?? "-",
    trackingNumber: data.trackingNumber ?? "-",
    trackingUrl: data.trackingUrl ?? "",
  };

  const html = await renderTemplate("templates/shipped.html", vars);
  const text = await renderTemplate("templates/shipped.txt", vars);

  await transporter.sendMail({
    from: process.env.FROM_EMAIL ?? "noreply@yourdomain.com",
    to,
    subject: `Your order ${vars.orderId} has shipped`,
    html,
    text,
  });
}

export async function sendOrderConfirmation(
  to: string,
  data: {
    orderId: string;
    totalCents: number;
    items: Array<{ title: string; quantity: number; unitCents: number; sku?: string | null }>;
    shippingName?: string | null;
    shippingAddr1?: string | null;
    shippingAddr2?: string | null;
    shippingCity?: string | null;
    shippingPost?: string | null;
    shippingCountry?: string | null;
  }
) {
  const transporter = makeTransport();

  const itemsHtml = (data.items ?? [])
    .map((it) => {
      const lineTotal = ((it.unitCents * it.quantity) / 100).toFixed(2);
      const skuPart = it.sku ? ` · SKU ${escapeHtml(it.sku)}` : "";
      return `
<div class="item" style="display:flex;justify-content:space-between;font-size:14px;padding:6px 0;border-bottom:1px solid #f3f4f6">
  <div>
    <div style="font-weight:600">${escapeHtml(it.title)}</div>
    <div class="muted" style="color:#6b7280;font-size:12px">Qty ${it.quantity}${skuPart}</div>
  </div>
  <div>€${lineTotal}</div>
</div>`.trim();
    })
    .join("");

  const plainLines = (data.items ?? [])
    .map((it) => {
      const lineTotal = ((it.unitCents * it.quantity) / 100).toFixed(2);
      return `- ${it.title} × ${it.quantity} — €${lineTotal}${it.sku ? ` (SKU ${it.sku})` : ""}`;
    })
    .join("\n");

  const shippingLines: string[] = [];
  if (data.shippingName) shippingLines.push(escapeHtml(data.shippingName));
  const addr = [data.shippingAddr1 ?? "", data.shippingAddr2 ?? ""].filter(Boolean).map(escapeHtml).join(", ");
  if (addr) shippingLines.push(addr);
  const cityLine = [data.shippingPost ?? "", data.shippingCity ?? ""].filter(Boolean).map(escapeHtml).join(" ");
  if (cityLine) shippingLines.push(cityLine);
  if (data.shippingCountry) shippingLines.push(escapeHtml(data.shippingCountry));
  const shippingBlock = shippingLines.join("<br/>");

  const vars = {
    orderId: data.orderId,
    total: (data.totalCents / 100).toFixed(2),
    itemsText: plainLines,
    storeUrl: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    year: String(new Date().getFullYear()),
  };

  let html = await renderTemplate("templates/order-confirmation.html", vars);
  html = html.replace("<!--ITEMS_HTML-->", itemsHtml || `<div class="muted" style="color:#6b7280;font-size:12px">No items</div>`);
  html = html.replace("<!--SHIPPING_BLOCK-->", shippingBlock || `<div class="muted" style="color:#6b7280;font-size:12px">No address</div>`);

  const text = await renderTemplate("templates/order-confirmation.txt", { ...vars, itemsText: plainLines });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL ?? "noreply@yourdomain.com",
    to,
    subject: `Order ${vars.orderId} confirmation`,
    html,
    text,
  });
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendVerifyEmail(to: string, url: string) {
  const transporter = makeTransport();
  const from = process.env.FROM_EMAIL ?? "noreply@yourdomain.com";

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif">
      <h2>Verify your email</h2>
      <p>Click the link below to verify your email address and activate your account:</p>
      <p><a href="${url}">${url}</a></p>
      <p style="color:#6b7280;font-size:12px">If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  const text = `Verify your email: ${url}\nIf you didn't request this, ignore this email.`;

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email",
    html,
    text,
  });
}

export async function sendPasswordReset(to: string, url: string) {
  const transporter = makeTransport();
  const from = process.env.FROM_EMAIL ?? "noreply@yourdomain.com";

  const html = `
    <div style="font-family:system-ui,Segoe UI,Roboto,sans-serif">
      <h2>Reset your password</h2>
      <p>Click the link below to set a new password:</p>
      <p><a href="${url}">${url}</a></p>
      <p style="color:#6b7280;font-size:12px">This link will expire soon. If you didn't request this, you can ignore this email.</p>
    </div>
  `;
  const text = `Reset your password: ${url}\nThis link will expire soon. If you didn't request this, ignore this email.`;

  await transporter.sendMail({
    from,
    to,
    subject: "Password reset",
    html,
    text,
  });
}
