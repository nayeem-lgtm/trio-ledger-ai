// Invoice HTML template renderer. Pure string output for email + preview.

export type InvoiceParty = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
};

export type InvoiceBank = {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  routing?: string;
  iban?: string;
  swift?: string;
  extra?: string;
};

export type InvoiceRenderData = {
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  items: { description: string; quantity: number; unit_price: number; amount: number; service_start?: string | null; service_end?: string | null }[];
  subtotal: number;
  discount?: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  bank_details?: InvoiceBank | null;
  payment_link?: string | null;
  sender: InvoiceParty;
  receiver: InvoiceParty;
};

export const INVOICE_TEMPLATES = [
  { id: "classic", label: "Classic", desc: "Timeless serif look with a bold total block." },
  { id: "modern", label: "Modern", desc: "Clean sans-serif with an accent color band." },
  { id: "minimal", label: "Minimal", desc: "Airy white template with subtle borders." },
  { id: "branded", label: "Branded", desc: "Full-width color header for stronger brand." },
];

const money = (n: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n || 0);

const partyBlock = (p: InvoiceParty) => `
  <div style="font-size:13px;line-height:1.55;color:#334155">
    <div style="font-weight:600;color:#0f172a">${p.name ?? ""}</div>
    ${p.company ? `<div>${p.company}</div>` : ""}
    ${p.address ? `<div>${p.address.replace(/\n/g, "<br/>")}</div>` : ""}
    ${p.email ? `<div>${p.email}</div>` : ""}
    ${p.phone ? `<div>${p.phone}</div>` : ""}
    ${p.tax_id ? `<div>Tax ID: ${p.tax_id}</div>` : ""}
  </div>
`;

const itemsTable = (d: InvoiceRenderData, accent: string) => `
  <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:13px">
    <thead>
      <tr style="background:${accent};color:#fff">
        <th style="padding:10px;text-align:left">Description</th>
        <th style="padding:10px;text-align:right;width:80px">Qty</th>
        <th style="padding:10px;text-align:right;width:110px">Rate</th>
        <th style="padding:10px;text-align:right;width:120px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${d.items
        .map(
          (i) => `
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:10px;vertical-align:top">
            ${i.description}
            ${i.service_start || i.service_end ? `<div style="font-size:11px;color:#64748b;margin-top:2px">Period: ${i.service_start ?? ""}${i.service_end ? " → " + i.service_end : ""}</div>` : ""}
          </td>
          <td style="padding:10px;text-align:right">${i.quantity}</td>
          <td style="padding:10px;text-align:right">${money(i.unit_price, d.currency)}</td>
          <td style="padding:10px;text-align:right;font-weight:600">${money(i.quantity * i.unit_price, d.currency)}</td>
        </tr>`,
        )
        .join("")}
    </tbody>
  </table>
`;

const totalsBlock = (d: InvoiceRenderData, accent: string) => `
  <table style="margin-left:auto;margin-top:12px;font-size:13px">
    <tr><td style="padding:4px 12px;color:#64748b">Subtotal</td><td style="padding:4px 0;text-align:right">${money(d.subtotal, d.currency)}</td></tr>
    ${d.discount ? `<tr><td style="padding:4px 12px;color:#64748b">Discount</td><td style="padding:4px 0;text-align:right">− ${money(d.discount, d.currency)}</td></tr>` : ""}
    ${d.tax_rate ? `<tr><td style="padding:4px 12px;color:#64748b">Tax (${d.tax_rate}%)</td><td style="padding:4px 0;text-align:right">${money(d.tax_amount, d.currency)}</td></tr>` : ""}
    <tr><td style="padding:10px 12px;font-weight:700;background:${accent};color:#fff">Total</td><td style="padding:10px 0;text-align:right;font-weight:700;background:${accent};color:#fff;padding-right:10px">${money(d.total, d.currency)}</td></tr>
  </table>
`;

const bankBlock = (b: InvoiceBank | null | undefined, link?: string | null) => {
  if (!b && !link) return "";
  return `
    <div style="margin-top:22px;padding:14px;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;font-size:12px;line-height:1.6;color:#334155">
      <div style="font-weight:600;color:#0f172a;margin-bottom:6px">Payment details</div>
      ${b?.bank_name ? `<div><b>Bank:</b> ${b.bank_name}</div>` : ""}
      ${b?.account_name ? `<div><b>Account name:</b> ${b.account_name}</div>` : ""}
      ${b?.account_number ? `<div><b>Account #:</b> ${b.account_number}</div>` : ""}
      ${b?.routing ? `<div><b>Routing:</b> ${b.routing}</div>` : ""}
      ${b?.iban ? `<div><b>IBAN:</b> ${b.iban}</div>` : ""}
      ${b?.swift ? `<div><b>SWIFT:</b> ${b.swift}</div>` : ""}
      ${b?.extra ? `<div>${b.extra.replace(/\n/g, "<br/>")}</div>` : ""}
      ${link ? `<div style="margin-top:8px"><a href="${link}" style="background:#0f172a;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none;display:inline-block">Pay now</a></div>` : ""}
    </div>
  `;
};

function shell(inner: string, accent: string, headerBg?: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:760px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,.08)">
    ${headerBg ? `<div style="height:8px;background:${headerBg}"></div>` : ""}
    ${inner}
  </div>
</body></html>`;
}

export function renderInvoice(d: InvoiceRenderData, template: string = "classic"): string {
  const accent =
    template === "modern" ? "#0f172a" :
    template === "minimal" ? "#334155" :
    template === "branded" ? "#1e3a8a" :
    "#0f172a";

  if (template === "minimal") {
    return shell(
      `<div style="padding:36px 40px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
          <div>
            <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#94a3b8">Invoice</div>
            <div style="font-size:22px;font-weight:600;margin-top:2px">${d.invoice_number}</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#64748b">
            <div>Issued: <b style="color:#0f172a">${d.issue_date}</b></div>
            ${d.due_date ? `<div>Due: <b style="color:#0f172a">${d.due_date}</b></div>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:32px;margin-bottom:12px">
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:4px">From</div>${partyBlock(d.sender)}</div>
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:4px">Bill to</div>${partyBlock(d.receiver)}</div>
        </div>
        ${itemsTable(d, accent)}
        ${totalsBlock(d, accent)}
        ${bankBlock(d.bank_details, d.payment_link)}
        ${d.notes ? `<div style="margin-top:18px;font-size:12px;color:#475569"><b>Notes:</b> ${d.notes}</div>` : ""}
        ${d.terms ? `<div style="margin-top:8px;font-size:12px;color:#475569"><b>Terms:</b> ${d.terms}</div>` : ""}
      </div>`,
      accent,
    );
  }

  if (template === "branded") {
    return shell(
      `<div style="background:${accent};color:#fff;padding:28px 36px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.7">Invoice</div>
            <div style="font-size:26px;font-weight:700;margin-top:2px">${d.invoice_number}</div>
          </div>
          <div style="text-align:right;font-size:12px;opacity:.85">
            <div>Issued: <b>${d.issue_date}</b></div>
            ${d.due_date ? `<div>Due: <b>${d.due_date}</b></div>` : ""}
          </div>
        </div>
      </div>
      <div style="padding:28px 36px">
        <div style="display:flex;gap:32px;margin-bottom:12px">
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#64748b;margin-bottom:6px">From</div>${partyBlock(d.sender)}</div>
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#64748b;margin-bottom:6px">Bill to</div>${partyBlock(d.receiver)}</div>
        </div>
        ${itemsTable(d, accent)}
        ${totalsBlock(d, accent)}
        ${bankBlock(d.bank_details, d.payment_link)}
        ${d.notes ? `<div style="margin-top:18px;font-size:12px;color:#475569"><b>Notes:</b> ${d.notes}</div>` : ""}
        ${d.terms ? `<div style="margin-top:8px;font-size:12px;color:#475569"><b>Terms:</b> ${d.terms}</div>` : ""}
      </div>`,
      accent,
    );
  }

  if (template === "modern") {
    return shell(
      `<div style="padding:32px 40px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:18px;border-bottom:2px solid ${accent}">
          <div>
            <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${accent};font-weight:700">Invoice</div>
            <div style="font-size:24px;font-weight:700;margin-top:2px">${d.invoice_number}</div>
          </div>
          <div style="text-align:right;font-size:12px;color:#64748b">
            <div>Issued: <b style="color:#0f172a">${d.issue_date}</b></div>
            ${d.due_date ? `<div>Due: <b style="color:#0f172a">${d.due_date}</b></div>` : ""}
          </div>
        </div>
        <div style="display:flex;gap:32px;margin-top:20px">
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:6px">From</div>${partyBlock(d.sender)}</div>
          <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:6px">Bill to</div>${partyBlock(d.receiver)}</div>
        </div>
        ${itemsTable(d, accent)}
        ${totalsBlock(d, accent)}
        ${bankBlock(d.bank_details, d.payment_link)}
        ${d.notes ? `<div style="margin-top:18px;font-size:12px;color:#475569"><b>Notes:</b> ${d.notes}</div>` : ""}
        ${d.terms ? `<div style="margin-top:8px;font-size:12px;color:#475569"><b>Terms:</b> ${d.terms}</div>` : ""}
      </div>`,
      accent,
      accent,
    );
  }

  // classic
  return shell(
    `<div style="padding:36px 40px;font-family:Georgia,'Times New Roman',serif">
      <div style="text-align:center;padding-bottom:18px;border-bottom:1px double #cbd5e1;margin-bottom:22px">
        <div style="font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#64748b">Invoice</div>
        <div style="font-size:28px;font-weight:700;margin-top:4px">${d.invoice_number}</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px">Issued ${d.issue_date}${d.due_date ? ` · Due ${d.due_date}` : ""}</div>
      </div>
      <div style="display:flex;gap:32px;margin-bottom:12px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
        <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:6px">From</div>${partyBlock(d.sender)}</div>
        <div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.14em;color:#94a3b8;margin-bottom:6px">Bill to</div>${partyBlock(d.receiver)}</div>
      </div>
      <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif">
        ${itemsTable(d, accent)}
        ${totalsBlock(d, accent)}
        ${bankBlock(d.bank_details, d.payment_link)}
        ${d.notes ? `<div style="margin-top:18px;font-size:12px;color:#475569"><b>Notes:</b> ${d.notes}</div>` : ""}
        ${d.terms ? `<div style="margin-top:8px;font-size:12px;color:#475569"><b>Terms:</b> ${d.terms}</div>` : ""}
      </div>
    </div>`,
    accent,
  );
}
