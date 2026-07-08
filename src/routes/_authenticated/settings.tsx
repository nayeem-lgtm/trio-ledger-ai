import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, KeyRound, CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";
import {
  getAISettings,
  saveAISettings,
  clearAIKey,
  testAIConnection,
} from "@/lib/ai-settings.functions";
import { getSmtpSettings, saveSmtpSettings, deleteSmtpSettings, testSmtp } from "@/lib/smtp.functions";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const get = useServerFn(getAISettings);
  const save = useServerFn(saveAISettings);
  const clear = useServerFn(clearAIKey);
  const test = useServerFn(testAIConnection);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => get(),
  });

  const [provider, setProvider] = useState<"lovable" | "openai" | "gemini">("lovable");
  const [openaiKey, setOpenaiKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [geminiModel, setGeminiModel] = useState("gemini-2.0-flash");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    setProvider(data.provider);
    setOpenaiModel(data.openai_model);
    setGeminiModel(data.gemini_model);
  }, [data]);

  const onSave = async () => {
    setSaving(true);
    try {
      await save({
        data: {
          provider,
          openai_api_key: openaiKey || null,
          gemini_api_key: geminiKey || null,
          openai_model: openaiModel,
          gemini_model: geminiModel,
        },
      });
      setOpenaiKey("");
      setGeminiKey("");
      await qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("AI settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const onTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await test();
      if (r.ok) setTestResult({ ok: true, msg: `${r.provider} responded successfully` });
      else setTestResult({ ok: false, msg: r.error ?? "Unknown error" });
    } catch (e: any) {
      setTestResult({ ok: false, msg: e?.message ?? "Failed" });
    } finally {
      setTesting(false);
    }
  };

  const onClear = async (p: "openai" | "gemini") => {
    try {
      await clear({ data: { provider: p } });
      await qc.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success(`${p} key removed`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            Settings
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Provider</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Use built-in Lovable AI, or plug in your own OpenAI / Google Gemini API key.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" /> Active provider
            </CardTitle>
            <CardDescription>Used for category suggestions, monthly insights and the AI Assistant.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable">Lovable AI (built-in, no key required)</SelectItem>
                  <SelectItem value="openai" disabled={!data?.has_openai_key && !openaiKey}>
                    OpenAI {!data?.has_openai_key && !openaiKey ? "— add key below" : ""}
                  </SelectItem>
                  <SelectItem value="gemini" disabled={!data?.has_gemini_key && !geminiKey}>
                    Google Gemini {!data?.has_gemini_key && !geminiKey ? "— add key below" : ""}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Save
              </Button>
              <Button variant="outline" onClick={onTest} disabled={testing || isLoading}>
                {testing && <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />}
                Test connection
              </Button>
              {testResult && (
                <span
                  className={`text-sm flex items-center gap-1 ${
                    testResult.ok ? "text-emerald-500" : "text-destructive"
                  }`}
                >
                  {testResult.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                  {testResult.msg}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> OpenAI
            </CardTitle>
            <CardDescription>
              Get a key at platform.openai.com. Stored privately, only you can read it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>API key {data?.openai_api_key && <Badge variant="secondary" className="ml-2">saved: {data.openai_api_key}</Badge>}</Label>
              <Input
                type="password"
                placeholder={data?.has_openai_key ? "Enter new key to replace" : "sk-..."}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} placeholder="gpt-4o-mini" />
            </div>
            {data?.has_openai_key && (
              <Button variant="ghost" size="sm" onClick={() => onClear("openai")}>
                Remove saved key
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4 text-primary" /> Google Gemini
            </CardTitle>
            <CardDescription>
              Get a key at aistudio.google.com/app/apikey. Stored privately, only you can read it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2">
              <Label>API key {data?.gemini_api_key && <Badge variant="secondary" className="ml-2">saved: {data.gemini_api_key}</Badge>}</Label>
              <Input
                type="password"
                placeholder={data?.has_gemini_key ? "Enter new key to replace" : "AIza..."}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label>Model</Label>
              <Input value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} placeholder="gemini-2.0-flash" />
            </div>
            {data?.has_gemini_key && (
              <Button variant="ghost" size="sm" onClick={() => onClear("gemini")}>
                Remove saved key
              </Button>
            )}
          </CardContent>
        </Card>
        <SmtpCard />
      </div>
    </AppShell>
  );
}

function SmtpCard() {
  const get = useServerFn(getSmtpSettings);
  const save = useServerFn(saveSmtpSettings);
  const del = useServerFn(deleteSmtpSettings);
  const test = useServerFn(testSmtp);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["smtp"], queryFn: () => get() });

  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setHost(data.host); setPort(data.port); setSecure(data.secure);
    setUsername(data.username); setFromEmail(data.from_email);
    setFromName(data.from_name ?? ""); setReplyTo(data.reply_to ?? "");
  }, [data]);

  const onSave = async () => {
    setBusy(true);
    try {
      await save({ data: {
        host, port: Number(port), secure,
        username, password: password || null,
        from_email: fromEmail, from_name: fromName || null, reply_to: replyTo || null,
      }});
      setPassword("");
      await qc.invalidateQueries({ queryKey: ["smtp"] });
      toast.success("SMTP saved");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  const onTest = async () => {
    if (!testTo) return toast.error("Enter a recipient email");
    setBusy(true);
    try {
      const r = await test({ data: { to: testTo } });
      if (r.ok) toast.success("Test email sent"); else toast.error(r.error ?? "Failed");
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Mail className="h-4 w-4 text-primary" /> SMTP (invoice sending)</CardTitle>
        <CardDescription>
          Configure your own mail server. Used to send invoices to buyers. Common providers: Gmail (smtp.gmail.com:587), SendGrid, Mailgun, Amazon SES.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Host</Label><Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" /></div>
          <div><Label className="text-xs">Port</Label><Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} /></div>
          <div className="col-span-2 flex items-center gap-2"><Switch checked={secure} onCheckedChange={setSecure} /><Label className="text-xs">Use TLS/SSL (port 465)</Label></div>
          <div><Label className="text-xs">Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@company.com" /></div>
          <div><Label className="text-xs">Password {data?.has_password && <Badge variant="secondary" className="ml-1">saved</Badge>}</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={data?.has_password ? "•••••• (leave blank to keep)" : "app password"} /></div>
          <div><Label className="text-xs">From email</Label><Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></div>
          <div><Label className="text-xs">From name</Label><Input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Cashflow Billing" /></div>
          <div className="col-span-2"><Label className="text-xs">Reply-to (optional)</Label><Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} /></div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onSave} disabled={busy}>Save</Button>
          {data?.has_password && (
            <Button variant="ghost" onClick={async () => { await del(); await qc.invalidateQueries({ queryKey: ["smtp"] }); toast.success("SMTP cleared"); }}>Remove</Button>
          )}
        </div>
        <div className="pt-3 border-t border-border">
          <Label className="text-xs">Send test to</Label>
          <div className="flex gap-2 mt-1">
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            <Button variant="outline" onClick={onTest} disabled={busy || !data?.has_password}>Send test</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
