import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Palette, Upload, ImageIcon, Loader2, Trash2 } from "lucide-react";
import { getBrandKit, saveBrandKit } from "@/lib/brand-kit.functions";
import { supabase } from "@/integrations/supabase/client";
import { renderInvoice } from "@/lib/invoice-template";

export const Route = createFileRoute("/_authenticated/brand")({
  component: BrandPage,
});

const FONT_OPTIONS = [
  "Inter", "Helvetica", "Arial", "Georgia", "Times New Roman",
  "Playfair Display", "Merriweather", "Roboto", "Poppins",
  "IBM Plex Sans", "IBM Plex Serif", "DM Sans", "DM Serif Display",
  "Space Grotesk", "Manrope", "Work Sans",
];

function BrandPage() {
  const getFn = useServerFn(getBrandKit);
  const saveFn = useServerFn(saveBrandKit);
  const qc = useQueryClient();
  const { data: kit } = useQuery({ queryKey: ["brand-kit"], queryFn: () => getFn() });

  const [f, setF] = useState<any>({
    id: null,
    name: "Default",
    logo_url: "", signature_url: "",
    brand_color: "#0f172a", accent_color: "#3b82f6",
    text_color: "#0f172a", muted_color: "#64748b",
    heading_font: "Inter", body_font: "Inter",
    page_size: "A4", watermark_text: "",
    tagline: "", company_name: "", company_address: "",
    company_email: "", company_phone: "", company_website: "", company_tax_id: "",
    footer_text: "", default_notes: "", default_terms: "Payment due within 14 days.",
    default_email_subject: "Invoice {{invoice_number}} from {{company_name}}",
    default_email_body: "Hi,\n\nPlease find your invoice attached below. Let me know if any questions.\n\nThanks!",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<null | "logo" | "signature">(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!kit) return;
    setF((prev: any) => ({ ...prev, ...kit, id: kit.id }));
  }, [kit]);

  const upload = async (kind: "logo" | "signature", file: File) => {
    setUploading(kind);
    try {
      const { data: userData, error: uErr } = await supabase.auth.getUser();
      if (uErr || !userData.user) throw new Error("Not signed in");
      const uid = userData.user.id;
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("brand-assets").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      const url = signed?.signedUrl ?? "";
      setF((p: any) => ({ ...p, [kind === "logo" ? "logo_url" : "signature_url"]: url }));
      toast.success(`${kind === "logo" ? "Logo" : "Signature"} uploaded`);
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { ...f, id: f.id ?? undefined } });
      toast.success("Brand kit saved");
      qc.invalidateQueries({ queryKey: ["brand-kit"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const previewHtml = renderInvoice({
    invoice_number: "INV-PREVIEW-001",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    currency: "USD",
    items: [
      { description: "Consulting services · Sprint 12", quantity: 40, unit_price: 125, amount: 5000, service_start: "2026-06-01", service_end: "2026-06-30" },
      { description: "Platform integration", quantity: 1, unit_price: 1500, amount: 1500 },
    ],
    subtotal: 6500, discount: 0, tax_rate: 8.5, tax_amount: 552.5, total: 7052.5,
    notes: f.default_notes || "Thank you for your business.",
    terms: f.default_terms,
    bank_details: { bank_name: "Chase", account_name: f.company_name || "Your Company", account_number: "•••• 4242" },
    payment_link: "https://pay.example.com/inv-preview",
    sender: {
      name: f.company_name, company: f.company_name,
      email: f.company_email, phone: f.company_phone,
      address: f.company_address, tax_id: f.company_tax_id, website: f.company_website,
    },
    receiver: { name: "Acme Corp", company: "Acme Inc.", email: "billing@acme.com", address: "123 Client St\nNew York, NY" },
    custom_fields: [{ label: "PO #", value: "PO-2026-089" }, { label: "Project", value: "Website redesign" }],
    brand: f, blocks: { show_logo: true, show_tagline: true, show_signature: !!f.signature_url, show_watermark: !!f.watermark_text, show_bank: true, show_notes: true, show_terms: true, show_footer: !!f.footer_text, show_custom_fields: true },
  }, "modern");

  return (
    <AppShell>
      <div className="p-8 space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Invoicing</div>
          <h1 className="font-display text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" /> Brand Kit
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your logo, colors, fonts and defaults — applied to every invoice you send.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_640px] gap-6 items-start">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Assets</CardTitle>
                <CardDescription>PNG or SVG recommended. Stored securely in your workspace.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <AssetSlot label="Logo" url={f.logo_url} uploading={uploading === "logo"}
                  onPick={() => logoInput.current?.click()}
                  onClear={() => setF({ ...f, logo_url: "" })} />
                <input ref={logoInput} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload("logo", e.target.files[0])} />

                <AssetSlot label="Signature" url={f.signature_url} uploading={uploading === "signature"}
                  onPick={() => sigInput.current?.click()}
                  onClear={() => setF({ ...f, signature_url: "" })} />
                <input ref={sigInput} type="file" accept="image/*" className="hidden"
                  onChange={(e) => e.target.files?.[0] && upload("signature", e.target.files[0])} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Colors</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <ColorField label="Brand color (header)" value={f.brand_color} onChange={(v) => setF({ ...f, brand_color: v })} />
                <ColorField label="Accent (buttons, totals)" value={f.accent_color} onChange={(v) => setF({ ...f, accent_color: v })} />
                <ColorField label="Text" value={f.text_color} onChange={(v) => setF({ ...f, text_color: v })} />
                <ColorField label="Muted / secondary" value={f.muted_color} onChange={(v) => setF({ ...f, muted_color: v })} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Typography</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <FontPicker label="Heading font" value={f.heading_font} onChange={(v) => setF({ ...f, heading_font: v })} />
                <FontPicker label="Body font" value={f.body_font} onChange={(v) => setF({ ...f, body_font: v })} />
                <div className="space-y-1.5">
                  <Label className="text-xs">Page size</Label>
                  <Select value={f.page_size} onValueChange={(v) => setF({ ...f, page_size: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="Letter">US Letter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Watermark text (optional)</Label>
                  <Input value={f.watermark_text ?? ""} onChange={(e) => setF({ ...f, watermark_text: e.target.value })} placeholder="PAID / DRAFT / CONFIDENTIAL" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Company details</CardTitle>
                <CardDescription>Used as the "From" party on every invoice by default.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <TF label="Company name" v={f.company_name} on={(v) => setF({ ...f, company_name: v })} />
                <TF label="Tagline" v={f.tagline} on={(v) => setF({ ...f, tagline: v })} placeholder="Design & engineering" />
                <TF label="Email" v={f.company_email} on={(v) => setF({ ...f, company_email: v })} />
                <TF label="Phone" v={f.company_phone} on={(v) => setF({ ...f, company_phone: v })} />
                <TF label="Website" v={f.company_website} on={(v) => setF({ ...f, company_website: v })} />
                <TF label="Tax ID / VAT" v={f.company_tax_id} on={(v) => setF({ ...f, company_tax_id: v })} />
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Textarea rows={2} value={f.company_address ?? ""} onChange={(e) => setF({ ...f, company_address: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs">Footer line (shown at bottom of every invoice)</Label>
                  <Textarea rows={2} value={f.footer_text ?? ""} onChange={(e) => setF({ ...f, footer_text: e.target.value })} placeholder="Thanks for the business · questions? billing@company.com" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Defaults</CardTitle>
                <CardDescription>Pre-filled on every new invoice. Placeholders: <code>{"{{invoice_number}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{buyer_name}}"}</code>, <code>{"{{total}}"}</code>, <code>{"{{due_date}}"}</code>.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Default notes</Label>
                  <Textarea rows={2} value={f.default_notes ?? ""} onChange={(e) => setF({ ...f, default_notes: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default terms</Label>
                  <Textarea rows={2} value={f.default_terms ?? ""} onChange={(e) => setF({ ...f, default_terms: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default email subject</Label>
                  <Input value={f.default_email_subject ?? ""} onChange={(e) => setF({ ...f, default_email_subject: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Default email body</Label>
                  <Textarea rows={4} value={f.default_email_body ?? ""} onChange={(e) => setF({ ...f, default_email_body: e.target.value })} />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save brand kit
              </Button>
            </div>
          </div>

          <div className="xl:sticky xl:top-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Live preview</CardTitle>
                <CardDescription>Sample invoice using your current brand kit.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <iframe title="brand-preview" srcDoc={previewHtml} className="w-full h-[900px] border-0 rounded-b-lg" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TF({ label, v, on, placeholder }: { label: string; v: string | null | undefined; on: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={v ?? ""} onChange={(e) => on(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 rounded border border-input bg-transparent cursor-pointer" />
        <Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

function FontPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function AssetSlot({ label, url, uploading, onPick, onClear }: any) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="border border-dashed border-input rounded-lg h-32 flex items-center justify-center bg-muted/30 relative overflow-hidden">
        {uploading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : url ? (
          <img src={url} alt={label} className="max-h-24 max-w-[85%] object-contain" />
        ) : (
          <div className="text-center text-muted-foreground">
            <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
            <div className="text-[11px]">No {label.toLowerCase()} uploaded</div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onPick} disabled={uploading} className="gap-1.5 flex-1">
          <Upload className="h-3.5 w-3.5" /> {url ? "Replace" : "Upload"}
        </Button>
        {url && (
          <Button size="sm" variant="ghost" onClick={onClear}><Trash2 className="h-3.5 w-3.5" /></Button>
        )}
      </div>
    </div>
  );
}
