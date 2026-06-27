import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtMoney } from "./format";

export type ReportTxn = {
  transaction_date: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  vendor: string | null;
  category_name: string | null;
  business_name: string;
};

export function downloadCSV(filename: string, rows: ReportTxn[]) {
  const headers = ["Date", "Business", "Type", "Category", "Vendor", "Description", "Amount"];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.transaction_date,
        r.business_name,
        r.type,
        r.category_name ?? "",
        r.vendor ?? "",
        r.description ?? "",
        r.amount.toFixed(2),
      ]
        .map(escape)
        .join(","),
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  trigger(blob, filename);
}

export function downloadPDF(opts: {
  filename: string;
  title: string;
  subtitle: string;
  totals: { income: number; expense: number; net: number };
  byCategory: { name: string; total: number; type: "income" | "expense" }[];
  rows: ReportTxn[];
}) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(opts.title, 14, 18);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(opts.subtitle, 14, 26);

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(`Revenue: ${fmtMoney(opts.totals.income)}`, 14, 38);
  doc.text(`Expenses: ${fmtMoney(opts.totals.expense)}`, 80, 38);
  doc.text(`Net Profit: ${fmtMoney(opts.totals.net)}`, 150, 38);

  autoTable(doc, {
    startY: 46,
    head: [["Category", "Type", "Total"]],
    body: opts.byCategory.map((c) => [c.name, c.type, fmtMoney(c.total)]),
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 9 },
  });

  autoTable(doc, {
    head: [["Date", "Business", "Type", "Category", "Vendor", "Description", "Amount"]],
    body: opts.rows.map((r) => [
      r.transaction_date,
      r.business_name,
      r.type,
      r.category_name ?? "",
      r.vendor ?? "",
      r.description ?? "",
      fmtMoney(r.amount),
    ]),
    headStyles: { fillColor: [30, 41, 59] },
    styles: { fontSize: 8 },
  });

  doc.save(opts.filename);
}

function trigger(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
