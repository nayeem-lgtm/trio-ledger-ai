import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { businessesQuery, categoriesQuery } from "@/lib/queries";
import { Sparkles, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { suggestCategory } from "@/lib/ai.functions";

export function TransactionDialog({
  open,
  onOpenChange,
  defaultBusinessId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultBusinessId?: string;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [businessId, setBusinessId] = useState<string>(defaultBusinessId ?? "");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const qc = useQueryClient();

  const { data: businesses = [] } = useQuery(businessesQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);

  const suggestFn = useServerFn(suggestCategory);

  useEffect(() => {
    if (open) {
      setBusinessId(defaultBusinessId ?? businesses[0]?.id ?? "");
    }
  }, [open, defaultBusinessId, businesses]);

  const availableCats = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === type &&
          (c.business_id === null || c.business_id === businessId),
      ),
    [categories, type, businessId],
  );

  const aiSuggest = async () => {
    if (!description && !vendor) return toast.error("Add a description or vendor first");
    setSuggesting(true);
    try {
      const names = availableCats.map((c) => c.name);
      const result = await suggestFn({
        data: { description: `${vendor} ${description}`.trim(), type, categories: names },
      });
      const match = availableCats.find(
        (c) => c.name.toLowerCase() === result.category.toLowerCase(),
      );
      if (match) {
        setCategoryId(match.id);
        toast.success(`Suggested: ${match.name}`);
      } else {
        toast.info(`AI suggested "${result.category}" but it's not in your list`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "AI suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!businessId) return toast.error("Pick a business");
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter an amount");
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("transactions").insert({
      business_id: businessId,
      category_id: categoryId || null,
      type,
      amount: amt,
      description: description || null,
      vendor: vendor || null,
      transaction_date: date,
      user_id: userData.user!.id,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Transaction added");
    qc.invalidateQueries({ queryKey: ["transactions"] });
    setAmount("");
    setVendor("");
    setDescription("");
    setCategoryId("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => { setType(v as any); setCategoryId(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income / Revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Business</Label>
              <Select value={businessId} onValueChange={setBusinessId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Amount (USD)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Vendor / Payer</Label>
            <Input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Notion, Stripe payout" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <Button type="button" size="sm" variant="ghost" onClick={aiSuggest} disabled={suggesting} className="h-7 gap-1.5 text-xs">
                {suggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI suggest
              </Button>
            </div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {availableCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
