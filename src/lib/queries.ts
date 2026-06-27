import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const businessesQuery = queryOptions({
  queryKey: ["businesses"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at");
    if (error) throw error;
    return data;
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (error) throw error;
    return data;
  },
});

export const transactionsQuery = (businessId?: string) =>
  queryOptions({
    queryKey: ["transactions", businessId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("transactions")
        .select("*, categories(name, color), businesses(name, color)")
        .order("transaction_date", { ascending: false })
        .limit(500);
      if (businessId) q = q.eq("business_id", businessId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
