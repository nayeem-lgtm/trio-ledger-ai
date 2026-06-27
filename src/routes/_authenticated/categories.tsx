import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { businessesQuery, categoriesQuery } from "@/lib/queries";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { CategoryDialog } from "@/components/CategoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/categories")({
  component: CatsPage,
});

function CatsPage() {
  const [open, setOpen] = useState(false);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: businesses = [] } = useQuery(businessesQuery);
  const qc = useQueryClient();

  const groups = useMemo(() => {
    const expense = categories.filter((c) => c.type === "expense");
    const income = categories.filter((c) => c.type === "income");
    return { expense, income };
  }, [categories]);

  const del = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["categories"] });
  };

  const bizName = (id: string | null) => id ? businesses.find((b) => b.id === id)?.name ?? "—" : "All";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">Income & expense buckets used for tracking.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New category</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Group title="Expense categories" items={groups.expense} bizName={bizName} onDelete={del} />
        <Group title="Income categories" items={groups.income} bizName={bizName} onDelete={del} />
      </div>

      <CategoryDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function Group({ title, items, bizName, onDelete }: { title: string; items: any[]; bizName: (id: string | null) => string; onDelete: (id: string) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3 group">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="font-medium">{c.name}</span>
                <Badge variant="secondary" className="text-xs">{bizName(c.business_id)}</Badge>
              </div>
              <Button size="icon" variant="ghost" onClick={() => onDelete(c.id)} className="opacity-0 group-hover:opacity-100">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {items.length === 0 && <div className="p-6 text-sm text-muted-foreground text-center">None yet.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
