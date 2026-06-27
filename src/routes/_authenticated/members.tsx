import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Mail, Users, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listTeamMembers,
  listInvites,
  inviteTeammate,
  removeMember,
  revokeInvite,
  updateMemberRole,
  type TeamRole,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/members")({
  component: MembersPage,
});

function MembersPage() {
  const qc = useQueryClient();
  const listMembersFn = useServerFn(listTeamMembers);
  const listInvitesFn = useServerFn(listInvites);
  const inviteFn = useServerFn(inviteTeammate);
  const removeFn = useServerFn(removeMember);
  const revokeFn = useServerFn(revokeInvite);
  const updateRoleFn = useServerFn(updateMemberRole);

  const { data: members = [], isLoading: lMembers } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listMembersFn(),
  });
  const { data: invites = [], isLoading: lInvites } = useQuery({
    queryKey: ["team-invites"],
    queryFn: () => listInvitesFn(),
  });

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["team-members"] });
    qc.invalidateQueries({ queryKey: ["team-invites"] });
  };

  const inviteMut = useMutation({
    mutationFn: (vars: { email: string; role: TeamRole }) => inviteFn({ data: vars }),
    onSuccess: (res: any) => {
      invalidate();
      setEmail("");
      if (res?.added) toast.success("Member added to your workspace");
      else toast.success("Invitation saved — they'll join when they sign up");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to invite"),
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => removeFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Member removed"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Invite revoked"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const roleMut = useMutation({
    mutationFn: (vars: { id: string; role: TeamRole }) => updateRoleFn({ data: vars }),
    onSuccess: () => { invalidate(); toast.success("Role updated"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    inviteMut.mutate({ email: email.trim(), role });
  };

  const pendingInvites = invites.filter((i) => i.status === "pending");

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
          Team
        </div>
        <h1 className="font-display text-[32px] leading-none font-semibold tracking-tight">
          Members & access
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Invite teammates by email. They'll see your businesses, categories and transactions according to their role.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Invite teammate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="sm:flex-1"
              required
            />
            <Select value={role} onValueChange={(v) => setRole(v as TeamRole)}>
              <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin · full access</SelectItem>
                <SelectItem value="editor">Editor · can record</SelectItem>
                <SelectItem value="viewer">Viewer · read only</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={inviteMut.isPending} className="gap-2">
              {inviteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Active members
            <Badge variant="secondary" className="ml-1">{members.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lMembers ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No team members yet. Invite someone above.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {m.full_name ?? m.email ?? "Member"}
                    </div>
                    {m.email && (
                      <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onValueChange={(v) => roleMut.mutate({ id: m.id, role: v as TeamRole })}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMut.mutate(m.id)}
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> Pending invites
            <Badge variant="secondary" className="ml-1">{pendingInvites.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {lInvites ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : pendingInvites.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No pending invitations.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingInvites.map((i) => (
                <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{i.email}</div>
                    <div className="text-xs text-muted-foreground">
                      Invited {new Date(i.created_at).toLocaleDateString()} · role: {i.role}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeMut.mutate(i.id)}
                    className="gap-2"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
