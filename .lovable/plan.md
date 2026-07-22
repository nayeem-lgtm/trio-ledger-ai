
# Insurance HQ — standalone SaaS module

Break the single 1,373-line `insurance-report.tsx` into a dedicated `/insurance` app with its own shell, its own navigation, and one page per section. Cashflow's sidebar disappears while the user is inside Insurance — it feels like a separate product.

## URL layout

```
/insurance                → Executive Overview (default landing)
/insurance/sales          → Sales & Policies
/insurance/daily-ops      → Ringba + CallTools daily activity
/insurance/qa             → Paid QA reviews
/insurance/payroll        → Weekly agent pay
/insurance/payables       → Vendor / agent outstanding costs
/insurance/agents         → Agent master
/insurance/settings       → Custom columns, agent filter defaults
```

Entry point: replace the "Insurance Report" item in the Cashflow sidebar with an **"Open Insurance HQ →"** launcher (also a tile on the Overview dashboard).

## Shell

- New layout route `_authenticated/insurance/route.tsx` renders `<InsuranceShell>` around `<Outlet />`, hiding the AppShell.
- Left sidebar: compact icon rail + labels, grouped as **Reports** (Overview, Sales, Daily Ops, QA) and **Operations** (Payroll, Payables, Agents), plus **Settings** at the bottom.
- Top bar: workspace name, global **DateRangePicker** with prev/next stepper, multi-agent filter, refresh, "Back to Cashflow" link, theme toggle, user menu.
- Filters live in URL search params (`from`, `to`, `agents`) so every page shares them and links are shareable.
- CEO-only badge shown in the top bar when the current user is CEO.

## Page anatomy (consistent across all sections)

Each section page follows the same template so the app feels unified:

1. **Header** — title, one-line description, primary actions (Add row, Import CSV, Export CSV).
2. **KPI strip** — 4–6 tiles tuned to that section (existing `report()` logic reused).
3. **Toolbar** — quick filters (status, source, carrier…), column visibility, density.
4. **Grid** — the existing `SheetGrid` with inline edits, sticky first column, keyboard nav.
5. **Detail drawer** — clicking a row opens a right-side drawer with all fields grouped (Customer / Policy / Payment / QA / Commission) instead of scrolling 30 columns horizontally. Editable, saves on blur.

## Executive Overview (`/insurance`)

- Hero KPI row: Sales counted, Monthly Premium, Carrier Revenue Received, Net Cash Position.
- CEO-only row (hidden otherwise): Total Commission, Receivable (75%), Commission Collected, Outstanding.
- **Weekly trend** — area chart of premium vs Ringba cost over the selected range.
- **Top agents leaderboard** — sales, premium, close rate; click → filters all pages by that agent.
- **Payables snapshot** — outstanding by category with due-soon highlighting.
- **QA health** — pass rate, chargebacks, callbacks converted.
- Each card has a "View details →" link to its section page.

## Backend

All existing tables (`insurance_sales`, `insurance_ringba`, `insurance_paid_qa`, `insurance_payroll`, `insurance_payables`, `insurance_agents`, `insurance_custom_columns`) and RLS stay as-is — no schema changes needed. Reads/writes continue through the browser Supabase client with workspace-scoped policies.

New shared module `src/lib/insurance/` extracts what the monolith currently inlines:

- `sheets.ts` — `SHEETS` config, `Col` type, computed columns.
- `queries.ts` — `useSheetRows(sheetKey, range, agents)`, `useUpsertRow`, `useDeleteRow`, `useCustomColumns`, `useIsCEO`.
- `SheetGrid.tsx`, `KpiStrip.tsx`, `RowDrawer.tsx`, `AgentFilter.tsx`, `InsuranceTopbar.tsx`, `InsuranceSidebar.tsx`, `InsuranceShell.tsx`.

## Migration steps

1. Extract logic into `src/lib/insurance/*` from the current file (no behavior change).
2. Create `_authenticated/insurance/route.tsx` layout + 7 leaf routes; each is ~80 lines using shared parts.
3. Add launcher tile on Cashflow dashboard + swap sidebar entry.
4. Delete old `_authenticated/insurance-report.tsx` and redirect `/insurance-report → /insurance` (via a thin route that `throw redirect`s) to keep old links working.
5. Verify build, then screenshot each page in the preview to confirm layout.

## What stays exactly the same

- All data, tables, RLS, agent filter, date-range presets, CSV export, custom columns, CEO commission logic, computed columns.
- Editing UX inside cells (inline edit, tab/enter, undo via refresh).

## What changes for the user

- Insurance opens in its own focused workspace with a dedicated sidebar.
- Each section is a distinct page — no giant tab bar, no scrolling past unrelated data.
- Shared top bar filters (date + agent) persist across pages via URL.
- New row drawer replaces horizontal scrolling for detailed editing.
- Cleaner Executive Overview with trend chart and leaderboard.
