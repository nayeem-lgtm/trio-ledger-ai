import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type TeamRole = "admin" | "editor" | "viewer";

export type MembershipRow = {
  id: string;
  owner_id: string;
  member_user_id: string;
  role: TeamRole;
  email: string | null;
  display_name: string | null;
};

export type InviteRow = {
  id: string;
  email: string;
  role: TeamRole;
  status: string;
  created_at: string;
};

export type Workspace = {
  owner_id: string;
  owner_email: string | null;
  owner_name: string | null;
  role: TeamRole;
  is_self: boolean;
};

/** All workspaces the current user can access (their own + ones they were invited to). */
export const listWorkspaces = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Workspace[]> => {
    const { supabase, userId } = context;
    const out: Workspace[] = [];

    const { data: me } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", userId)
      .maybeSingle();
    out.push({
      owner_id: userId,
      owner_email: me?.email ?? null,
      owner_name: me?.display_name ?? me?.email ?? "My workspace",
      role: "admin",
      is_self: true,
    });

    const { data: memberships, error } = await supabase
      .from("team_members")
      .select("owner_id, role")
      .eq("member_user_id", userId);
    if (error) throw error;

    if (memberships && memberships.length > 0) {
      const ownerIds = memberships.map((m) => m.owner_id);
      const { data: owners } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", ownerIds);
      const byId = new Map((owners ?? []).map((p) => [p.id, p]));
      for (const m of memberships) {
        const p = byId.get(m.owner_id);
        out.push({
          owner_id: m.owner_id,
          owner_email: p?.email ?? null,
          owner_name: p?.display_name ?? p?.email ?? "Shared workspace",
          role: m.role as TeamRole,
          is_self: false,
        });
      }
    }
    return out;
  });

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MembershipRow[]> => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("team_members")
      .select("id, owner_id, member_user_id, role")
      .eq("owner_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) return [];
    const ids = rows.map((r) => r.member_user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, display_name")
      .in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      id: r.id,
      owner_id: r.owner_id,
      member_user_id: r.member_user_id,
      role: r.role as TeamRole,
      email: byId.get(r.member_user_id)?.email ?? null,
      display_name: byId.get(r.member_user_id)?.display_name ?? null,
    }));
  });

export const listInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InviteRow[]> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("team_invites")
      .select("id, email, role, status, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InviteRow[];
  });

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

export const inviteTeammate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(InviteSchema)
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const email = data.email.trim().toLowerCase();

    // If a profile with that email already exists, create the membership directly.
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing?.id) {
      if (existing.id === userId) throw new Error("That's you.");
      const { error } = await supabase
        .from("team_members")
        .upsert(
          { owner_id: userId, member_user_id: existing.id, role: data.role },
          { onConflict: "owner_id,member_user_id" },
        );
      if (error) throw error;
      return { added: true as const };
    }

    // Otherwise stash a pending invite that will be claimed when they sign up.
    const { error } = await supabase
      .from("team_invites")
      .upsert(
        { owner_id: userId, email, role: data.role, status: "pending" },
        { onConflict: "owner_id,email" },
      );
    if (error) throw error;
    return { invited: true as const };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid(), role: z.enum(["admin", "editor", "viewer"]) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("team_members")
      .update({ role: data.role })
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const revokeInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("team_invites")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const acceptMyInvites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("accept_my_pending_invites");
    if (error) throw error;
    return { accepted: Number(data ?? 0) };
  });
