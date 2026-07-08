// Professional invoice HTML template renderer with brand-kit overlay.
// Pure string output, safe for email + iframe preview.

export type InvoiceParty = {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  website?: string;
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

export type InvoiceBrand = {
  logo_url?: string | null;
  signature_url?: string | null;
  brand_color?: string | null;
  accent_color?: string | null;
  text_color?: string | null;
  muted_color?: string | null;
  heading_font?: string | null;
  body_font?: string | null;
  watermark_text?: string | null;
  tagline?: string | null;
  footer_text?: string | null;
  page_size?: string | null;
};

export type InvoiceBlocks = {
  show_logo?: boolean;
  show_tagline?: boolean;
  show_signature?: boolean;
  show_watermark?: boolean;
  show_bank?: boolean;
  show_notes?: boolean;
  show_terms?: boolean;
  show_footer?: boolean;
  show_custom_fields?: boolean;
  show_qr?: boolean;
  header_align?: "left" | "center" | "right";
};

export type CustomField = { label: string; value: string };

export type InvoiceLineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  service_start?: string | null;
  service_end?: string | null;
  item_tax_rate?: number;
  item_discount?: number;
};

export type InvoiceRenderData = {
  invoice_number: string;
  issue_date: string;
  due_date?: string | null;
  po_number?: string | null;
  project_code?: string | null;
  currency: string;
  items: InvoiceLineItem[];
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
  custom_fields?: CustomField[];
  brand?: InvoiceBrand | null;
  blocks?: InvoiceBlocks | null;
};

export const INVOICE_TEMPLATES = [
  { id: "classic", label: "Classic", desc: "Timeless serif look with a bold total block." },
  { id: "modern", label: "Modern", desc: "Clean sans-serif with an accent color band." },
  { id: "minimal", label: "Minimal", desc: "Airy white template with subtle borders." },
  { id: "branded", label: "Branded", desc: "Full-width color header for stronger brand." },
];

export const DEFAULT_BLOCKS: Required<InvoiceBlocks> = {
  show_logo: true,
  show_tagline: true,
  show_signature: false,
  show_watermark: false,
  show_bank: true,
  show_notes: true,
  show_terms: true,
  show_footer: true,
  show_custom_fields: true,
  show_qr: false,
  header_align: "left",
};

const money = (n: number, cur: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur || "USD" }).format(n || 0);

const esc = (s?: string | null) =>
  (s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const partyBlock = (p: InvoiceParty, muted: string, text: string) => `
  <div style="font-size:13px;line-height:1.6;color:${muted}">
    <div style="font-weight:600;color:${text};font-size:14px">${esc(p.name)}</div>
    ${p.company ? `<div>${esc(p.company)}</div>` : ""}
    ${p.address ? `<div style="white-space:pre-line">${esc(p.address)}</div>` : ""}
    ${p.email ? `<div>${esc(p.email)}</div>` : ""}
    ${p.phone ? `<div>${esc(p.phone)}</div>` : ""}
    ${p.website ? `<div>${esc(p.website)}</div>` : ""}
    ${p.tax_id ? `<div>Tax ID: ${esc(p.tax_id)}</div>` : ""}
  </div>
`;

const customFieldsBlock = (fields: CustomField[] | undefined, muted: string, text: string) => {
  if (!fields || fields.length === 0) return "";
  return `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px 24px;margin-top:14px;font-size:12px">
    ${fields
      .filter((f) => f.label || f.value)
      .map(
        (f) => `<div><span style="color:${muted};text-transform:uppercase;letter-spacing:.08em;font-size:10px">${esc(f.label)}</span><div style="color:${text};font-weight:500;margin-top:2px">${esc(f.value)}</div></div>`,
      )
      .join("")}
  </div>`;
};

const itemsTable = (d: InvoiceRenderData, accent: string, text: string, muted: string) => {
  const anyLineExtras = d.items.some((i) => (i.item_tax_rate ?? 0) > 0 || (i.item_discount ?? 0) > 0);
  return `
  <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
    <thead>
      <tr style="background:${accent};color:#fff">
        <th style="padding:12px 14px;text-align:left;font-weight:600;letter-spacing:.02em">Description</th>
        <th style="padding:12px 8px;text-align:right;width:70px;font-weight:600">Qty</th>
        <th style="padding:12px 8px;text-align:right;width:110px;font-weight:600">Rate</th>
        ${anyLineExtras ? `<th style="padding:12px 8px;text-align:right;width:70px;font-weight:600">Disc</th><th style="padding:12px 8px;text-align:right;width:60px;font-weight:600">Tax</th>` : ""}
        <th style="padding:12px 14px;text-align:right;width:120px;font-weight:600">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${d.items
        .map((i) => {
          const lineSub = Number(i.quantity) * Number(i.unit_price);
          const lineDisc = Number(i.item_discount ?? 0);
          const lineTax = Math.max(0, lineSub - lineDisc) * (Number(i.item_tax_rate ?? 0) / 100);
          const lineTotal = Math.max(0, lineSub - lineDisc) + lineTax;
          return `
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:12px 14px;vertical-align:top;color:${text}">
            <div style="font-weight:500">${esc(i.description)}</div>
            ${i.service_start || i.service_end ? `<div style="font-size:11px;color:${muted};margin-top:3px">Period: ${esc(i.service_start ?? "")}${i.service_end ? " → " + esc(i.service_end) : ""}</div>` : ""}
          </td>
          <td style="padding:12px 8px;text-align:right;color:${text}">${i.quantity}</td>
          <td style="padding:12px 8px;text-align:right;color:${text}">${money(i.unit_price, d.currency)}</td>
          ${anyLineExtras ? `<td style="padding:12px 8px;text-align:right;color:${muted}">${lineDisc ? "− " + money(lineDisc, d.currency) : "—"}</td><td style="padding:12px 8px;text-align:right;color:${muted}">${i.item_tax_rate ? i.item_tax_rate + "%" : "—"}</td>` : ""}
          <td style="padding:12px 14px;text-align:right;font-weight:600;color:${text}">${money(lineTotal, d.currency)}</td>
        </tr>`;
        })
        .join("")}
    </tbody>
  </table>
`;
};

const totalsBlock = (d: InvoiceRenderData, accent: string, muted: string) => `
  <table style="margin-left:auto;margin-top:16px;font-size:13px;min-width:280px">
    <tr><td style="padding:6px 16px;color:${muted}">Subtotal</td><td style="padding:6px 0;text-align:right">${money(d.subtotal, d.currency)}</td></tr>
    ${d.discount ? `<tr><td style="padding:6px 16px;color:${muted}">Discount</td><td style="padding:6px 0;text-align:right">− ${money(d.discount, d.currency)}</td></tr>` : ""}
    ${d.tax_rate ? `<tr><td style="padding:6px 16px;color:${muted}">Tax (${d.tax_rate}%)</td><td style="padding:6px 0;text-align:right">${money(d.tax_amount, d.currency)}</td></tr>` : ""}
    <tr><td style="padding:14px 16px;font-weight:700;background:${accent};color:#fff;font-size:14px;letter-spacing:.02em">Total Due</td><td style="padding:14px 16px;text-align:right;font-weight:700;background:${accent};color:#fff;font-size:16px">${money(d.total, d.currency)}</td></tr>
  </table>
`;

const bankBlock = (b: InvoiceBank | null | undefined, link: string | null | undefined, accent: string, muted: string, text: string) => {
  if (!b && !link) return "";
  const hasBank = b && (b.bank_name || b.account_number || b.iban || b.swift || b.routing || b.account_name || b.extra);
  if (!hasBank && !link) return "";
  return `
    <div style="margin-top:26px;padding:16px 18px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;font-size:12px;line-height:1.7;color:${text}">
      <div style="font-weight:700;color:${accent};margin-bottom:8px;text-transform:uppercase;letter-spacing:.1em;font-size:11px">Payment details</div>
      ${hasBank ? `<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:4px 20px">
        ${b?.bank_name ? `<div><span style="color:${muted}">Bank</span> · <b>${esc(b.bank_name)}</b></div>` : ""}
        ${b?.account_name ? `<div><span style="color:${muted}">Account name</span> · <b>${esc(b.account_name)}</b></div>` : ""}
        ${b?.account_number ? `<div><span style="color:${muted}">Account #</span> · <b>${esc(b.account_number)}</b></div>` : ""}
        ${b?.routing ? `<div><span style="color:${muted}">Routing</span> · <b>${esc(b.routing)}</b></div>` : ""}
        ${b?.iban ? `<div><span style="color:${muted}">IBAN</span> · <b>${esc(b.iban)}</b></div>` : ""}
        ${b?.swift ? `<div><span style="color:${muted}">SWIFT</span> · <b>${esc(b.swift)}</b></div>` : ""}
      </div>` : ""}
      ${b?.extra ? `<div style="margin-top:8px;white-space:pre-line;color:${muted}">${esc(b.extra)}</div>` : ""}
      ${link ? `<div style="margin-top:12px"><a href="${esc(link)}" style="background:${accent};color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;letter-spacing:.02em">Pay now →</a></div>` : ""}
    </div>
  `;
};

const signatureBlock = (url: string | null | undefined, senderName: string | undefined, muted: string) => {
  if (!url) return "";
  return `<div style="margin-top:32px;padding-top:16px;border-top:1px dashed #cbd5e1;max-width:260px">
    <img src="${esc(url)}" alt="signature" style="max-height:60px;max-width:220px;display:block"/>
    <div style="font-size:11px;color:${muted};margin-top:6px;text-transform:uppercase;letter-spacing:.1em">Authorized signature${senderName ? ` · ${esc(senderName)}` : ""}</div>
  </div>`;
};

const watermarkLayer = (text: string | null | undefined) => {
  if (!text) return "";
  return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:0">
    <div style="font-size:120px;font-weight:900;color:rgba(15,23,42,.05);transform:rotate(-24deg);letter-spacing:.15em;text-transform:uppercase;white-space:nowrap">${esc(text)}</div>
  </div>`;
};

const footerLine = (text: string | null | undefined, muted: string) => {
  if (!text) return "";
  return `<div style="margin-top:24px;padding-top:14px;border-top:1px solid #e2e8f0;text-align:center;font-size:11px;color:${muted};white-space:pre-line">${esc(text)}</div>`;
};

function logoImg(url: string | null | undefined, align: string = "left") {
  if (!url) return "";
  return `<img src="${esc(url)}" alt="logo" style="max-height:56px;max-width:200px;display:block;margin:${align === "center" ? "0 auto" : align === "right" ? "0 0 0 auto" : "0"}"/>`;
}

function shell(inner: string, pageWidth: string, bodyFont: string, textColor: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>Invoice</title></head>
<body style="margin:0;padding:24px;background:#f1f5f9;font-family:${bodyFont};color:${textColor};-webkit-font-smoothing:antialiased">
  <div style="max-width:${pageWidth};margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 4px 30px rgba(15,23,42,.08);position:relative">
    ${inner}
  </div>
</body></html>`;
}

export function renderInvoice(d: InvoiceRenderData, template: string = "classic"): string {
  const brand = d.brand ?? {};
  const blocks: Required<InvoiceBlocks> = { ...DEFAULT_BLOCKS, ...(d.blocks ?? {}) };
  const accent = brand.accent_color ||
    (template === "modern" ? "#0f172a" : template === "branded" ? "#1e3a8a" : template === "minimal" ? "#334155" : "#0f172a");
  const headerBg = brand.brand_color || accent;
  const text = brand.text_color || "#0f172a";
  const muted = brand.muted_color || "#64748b";
  const bodyFont = brand.body_font ? `${brand.body_font}, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif` : `-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
  const headingFont = brand.heading_font ? `${brand.heading_font}, ${bodyFont}` : (template === "classic" ? `Georgia, 'Times New Roman', serif` : bodyFont);
  const pageWidth = brand.page_size === "Letter" ? "816px" : "794px"; // A4 default
  const align = blocks.header_align;

  const logo = blocks.show_logo ? logoImg(brand.logo_url, align) : "";
  const tagline = blocks.show_tagline && brand.tagline
    ? `<div style="font-size:11px;color:${muted};margin-top:4px;font-style:italic">${esc(brand.tagline)}</div>` : "";
  const wm = blocks.show_watermark ? watermarkLayer(brand.watermark_text) : "";
  const sig = blocks.show_signature ? signatureBlock(brand.signature_url, d.sender?.name, muted) : "";
  const cf = blocks.show_custom_fields ? customFieldsBlock(d.custom_fields, muted, text) : "";
  const notes = blocks.show_notes && d.notes ? `<div style="margin-top:22px;font-size:12px;color:${text};line-height:1.6"><b style="color:${accent};text-transform:uppercase;letter-spacing:.08em;font-size:10px">Notes</b><div style="margin-top:4px;white-space:pre-line;color:${muted}">${esc(d.notes)}</div></div>` : "";
  const terms = blocks.show_terms && d.terms ? `<div style="margin-top:14px;font-size:12px;color:${text};line-height:1.6"><b style="color:${accent};text-transform:uppercase;letter-spacing:.08em;font-size:10px">Terms</b><div style="margin-top:4px;white-space:pre-line;color:${muted}">${esc(d.terms)}</div></div>` : "";
  const bank = blocks.show_bank ? bankBlock(d.bank_details, d.payment_link, accent, muted, text) : "";
  const footer = blocks.show_footer ? footerLine(brand.footer_text, muted) : "";

  const metaRow = `
    <div style="text-align:right;font-size:12px;color:${muted};line-height:1.7">
      <div>Issued <b style="color:${text}">${esc(d.issue_date)}</b></div>
      ${d.due_date ? `<div>Due <b style="color:${text}">${esc(d.due_date)}</b></div>` : ""}
      ${d.po_number ? `<div>PO # <b style="color:${text}">${esc(d.po_number)}</b></div>` : ""}
      ${d.project_code ? `<div>Project <b style="color:${text}">${esc(d.project_code)}</b></div>` : ""}
    </div>
  `;

  let inner = "";

  if (template === "branded") {
    inner = `${wm}
      <div style="background:${headerBg};color:#fff;padding:32px 44px;position:relative;z-index:1">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:24px">
          <div style="flex:1">
            ${logo ? `<div style="background:#fff;padding:8px 12px;border-radius:8px;display:inline-block;margin-bottom:12px">${logo}</div>` : ""}
            <div style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;opacity:.7">Invoice</div>
            <div style="font-family:${headingFont};font-size:30px;font-weight:700;margin-top:2px;letter-spacing:-.01em">${esc(d.invoice_number)}</div>
            ${tagline ? tagline.replace(muted, "rgba(255,255,255,.75)") : ""}
          </div>
          <div style="text-align:right;font-size:12px;opacity:.9;line-height:1.7">
            <div>Issued <b>${esc(d.issue_date)}</b></div>
            ${d.due_date ? `<div>Due <b>${esc(d.due_date)}</b></div>` : ""}
            ${d.po_number ? `<div>PO # <b>${esc(d.po_number)}</b></div>` : ""}
            ${d.project_code ? `<div>Project <b>${esc(d.project_code)}</b></div>` : ""}
          </div>
        </div>
      </div>
      <div style="padding:30px 44px;position:relative;z-index:1">
        <div style="display:flex;gap:40px;margin-bottom:8px">
          <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">From</div>${partyBlock(d.sender, muted, text)}</div>
          <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">Bill to</div>${partyBlock(d.receiver, muted, text)}</div>
        </div>
        ${cf}
        ${itemsTable(d, accent, text, muted)}
        ${totalsBlock(d, accent, muted)}
        ${bank}
        ${notes}${terms}
        ${sig}
        ${footer}
      </div>`;
  } else if (template === "minimal") {
    inner = `${wm}<div style="padding:44px 48px;position:relative;z-index:1">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;gap:24px">
        <div style="flex:1">
          ${logo}
          <div style="font-size:10px;letter-spacing:.24em;text-transform:uppercase;color:${muted};margin-top:${logo ? "16px" : "0"}">Invoice</div>
          <div style="font-family:${headingFont};font-size:26px;font-weight:600;margin-top:4px;letter-spacing:-.01em;color:${text}">${esc(d.invoice_number)}</div>
          ${tagline}
        </div>
        ${metaRow}
      </div>
      <div style="display:flex;gap:40px;margin-bottom:8px">
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">From</div>${partyBlock(d.sender, muted, text)}</div>
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">Bill to</div>${partyBlock(d.receiver, muted, text)}</div>
      </div>
      ${cf}
      ${itemsTable(d, accent, text, muted)}
      ${totalsBlock(d, accent, muted)}
      ${bank}${notes}${terms}${sig}${footer}
    </div>`;
  } else if (template === "modern") {
    inner = `${wm}<div style="padding:36px 44px;position:relative;z-index:1">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid ${accent};gap:24px">
        <div style="flex:1">
          ${logo}
          <div style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:${accent};font-weight:700;margin-top:${logo ? "14px" : "0"}">Invoice</div>
          <div style="font-family:${headingFont};font-size:28px;font-weight:700;margin-top:4px;letter-spacing:-.01em;color:${text}">${esc(d.invoice_number)}</div>
          ${tagline}
        </div>
        ${metaRow}
      </div>
      <div style="display:flex;gap:40px;margin-top:24px">
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">From</div>${partyBlock(d.sender, muted, text)}</div>
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">Bill to</div>${partyBlock(d.receiver, muted, text)}</div>
      </div>
      ${cf}
      ${itemsTable(d, accent, text, muted)}
      ${totalsBlock(d, accent, muted)}
      ${bank}${notes}${terms}${sig}${footer}
    </div>`;
  } else {
    // classic
    inner = `${wm}<div style="padding:42px 48px;position:relative;z-index:1">
      <div style="text-align:${align};padding-bottom:22px;border-bottom:1px double #cbd5e1;margin-bottom:26px">
        ${logo ? `<div style="margin-bottom:14px">${logo}</div>` : ""}
        <div style="font-size:11px;letter-spacing:.36em;text-transform:uppercase;color:${muted}">Invoice</div>
        <div style="font-family:${headingFont};font-size:32px;font-weight:700;margin-top:6px;letter-spacing:-.01em;color:${text}">${esc(d.invoice_number)}</div>
        <div style="font-size:12px;color:${muted};margin-top:4px">Issued ${esc(d.issue_date)}${d.due_date ? ` · Due ${esc(d.due_date)}` : ""}${d.po_number ? ` · PO ${esc(d.po_number)}` : ""}</div>
        ${tagline}
      </div>
      <div style="display:flex;gap:40px;margin-bottom:8px">
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">From</div>${partyBlock(d.sender, muted, text)}</div>
        <div style="flex:1"><div style="font-size:10px;text-transform:uppercase;letter-spacing:.16em;color:${muted};margin-bottom:8px;font-weight:600">Bill to</div>${partyBlock(d.receiver, muted, text)}</div>
      </div>
      ${cf}
      ${itemsTable(d, accent, text, muted)}
      ${totalsBlock(d, accent, muted)}
      ${bank}${notes}${terms}${sig}${footer}
    </div>`;
  }

  return shell(inner, pageWidth, bodyFont, text);
}
