"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  UserX,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import type { ClubMember } from "@/lib/queries/clubs";
import {
  apiFetch,
  inputCls,
  btnPrimaryCls,
  Avatar,
  ROLE_BADGE,
} from "../shared/club-ui";

interface ManageTabProps {
  clubId: string;
  isPublic: boolean;
  allowJoinRequests: boolean;
  myRole: "owner" | "moderator" | null;
  sessionUserId?: string | null;
  members: ClubMember[];
  onMembersChange: (members: ClubMember[]) => void;
}

export function ManageTab({
  clubId,
  isPublic,
  allowJoinRequests,
  myRole,
  sessionUserId,
  members,
  onMembersChange,
}: ManageTabProps) {
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [joinReqLoaded, setJoinReqLoaded] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!isPublic && allowJoinRequests) loadJoinRequests();
  }, []);

  async function loadJoinRequests() {
    if (joinReqLoaded) return;
    try {
      const data = await apiFetch(`/clubs/${clubId}/requests`);
      setJoinRequests(data.data ?? []);
    } catch {
      /**/
    } finally {
      setJoinReqLoaded(true);
    }
  }

  async function handleInvite() {
    if (!inviteInput.trim()) return;
    setInviteLoading(true);
    try {
      await apiFetch(`/clubs/${clubId}/invite`, {
        method: "POST",
        body: JSON.stringify({ username: inviteInput.replace(/^@/, "") }),
      });
      toast.success("Invite sent!");
      setInviteInput("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    try {
      await apiFetch(`/clubs/${clubId}/requests/${requestId}/accept`, {
        method: "POST",
      });
      setJoinRequests((prev) => prev.filter((r) => r.request.id !== requestId));
      toast.success("Request accepted!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleRejectRequest(requestId: string) {
    try {
      await apiFetch(`/clubs/${clubId}/requests/${requestId}/reject`, {
        method: "POST",
      });
      setJoinRequests((prev) => prev.filter((r) => r.request.id !== requestId));
      toast.success("Request rejected.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleKick(userId: string) {
    if (!confirm("Remove this member from the club?")) return;
    try {
      await apiFetch(`/clubs/${clubId}/members/${userId}`, {
        method: "DELETE",
      });
      onMembersChange(members.filter((m) => m.userId !== userId));
      toast.success("Member removed.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleSetRole(userId: string, newRole: "moderator" | "member") {
    try {
      await apiFetch(`/clubs/${clubId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      onMembersChange(
        members.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)),
      );
      toast.success(
        newRole === "moderator" ? "Promoted to moderator." : "Demoted to member.",
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* Invite */}
      <div
        className="rounded-2xl border border-white/10 p-6 shadow-xl relative overflow-hidden"
        style={{ background: "rgba(24,24,27,0.4)", backdropFilter: "blur(20px)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/[0.02] to-transparent opacity-50 pointer-events-none" />
        <h3 className="relative z-10 text-sm font-semibold text-zinc-400 mb-5 flex items-center gap-2.5">
          <UserPlus className="h-4 w-4 text-purple-400" /> Invite Member
        </h3>
        <div className="flex gap-2">
          <input
            value={inviteInput}
            onChange={(e) => setInviteInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            placeholder="@username"
            className={`${inputCls} flex-1`}
          />
          <button
            onClick={handleInvite}
            disabled={inviteLoading || !inviteInput.trim()}
            className={btnPrimaryCls}
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
            }}
          >
            {inviteLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Invite
          </button>
        </div>
      </div>

      {/* Join Requests */}
      {!isPublic && allowJoinRequests && (
        <div
          className="rounded-xl border border-white/7 p-5"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <h3 className="text-sm font-semibold text-zinc-400 mb-4 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-indigo-400" />
            Join Requests
            {joinRequests.length > 0 && (
              <span className="text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/25 px-2 py-0.5 rounded-md">
                {joinRequests.length}
              </span>
            )}
          </h3>
          {!joinReqLoaded ? (
            <div className="flex items-center gap-2 text-sm text-zinc-600 py-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading...
            </div>
          ) : joinRequests.length === 0 ? (
            <p className="text-sm text-zinc-700 py-2">
              No pending requests.
            </p>
          ) : (
            <div className="space-y-2">
              {joinRequests.map((req: any) => {
                const name =
                  req.requester?.displayName ?? req.requester?.username ?? "?";
                return (
                  <div
                    key={req.request.id}
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                  >
                    <Avatar
                      src={req.requester?.avatarUrl}
                      name={name}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-zinc-200 block">
                        {name}
                      </span>
                      {req.requester?.username && (
                        <span className="text-xs text-zinc-600">
                          @{req.requester.username}
                        </span>
                      )}
                      {req.request.message && (
                        <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                          {req.request.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.request.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-purple-400 hover:text-purple-300 border border-purple-500/25 hover:border-purple-400/40 bg-purple-500/8 hover:bg-purple-500/15 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <UserCheck className="h-3.5 w-3.5" /> Accept
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.request.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-red-400 border border-white/10 hover:border-red-500/30 bg-white/5 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <UserX className="h-3.5 w-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Member Management */}
      <div
        className="relative rounded-2xl border border-white/10 p-6 overflow-hidden shadow-2xl"
        style={{
          background: "rgba(24,24,27,0.4)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,1) 2px, rgba(255,255,255,1) 3px)",
          }}
        />
        <h3 className="relative z-10 text-sm font-semibold text-zinc-400 mb-5 flex items-center gap-2">
          <Users className="h-4 w-4 text-zinc-500" /> Manage Members
        </h3>
        {members.length === 0 ? (
          <p className="text-sm text-zinc-700 py-2">No members.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m) => {
              const name = m.user.displayName ?? m.user.username ?? "?";
              const isMyself = m.userId === sessionUserId;
              const canKick =
                !isMyself &&
                m.role !== "owner" &&
                (myRole === "owner" ||
                  (myRole === "moderator" && m.role === "member"));
              const canPromote = myRole === "owner" && !isMyself && m.role !== "owner";
              const badge =
                ROLE_BADGE[m.role as keyof typeof ROLE_BADGE] ??
                ROLE_BADGE.member;
              const BadgeIcon = badge.icon;
              return (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar src={m.user.avatarUrl} name={name} size="md" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-zinc-200 block line-clamp-1">
                      {name}
                    </span>
                    {m.user.username && (
                      <span className="text-xs text-zinc-600">
                        @{m.user.username}
                      </span>
                    )}
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${badge.color}`}
                  >
                    <BadgeIcon className="h-3 w-3" />
                    {badge.label}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {canPromote && m.role === "member" && (
                      <button
                        onClick={() => handleSetRole(m.userId, "moderator")}
                        title="Promote to Moderator"
                        className="p-1.5 rounded-lg text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 transition-all"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                    )}
                    {canPromote && m.role === "moderator" && (
                      <button
                        onClick={() => handleSetRole(m.userId, "member")}
                        title="Demote to Member"
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-300 hover:bg-white/5 transition-all"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    )}
                    {canKick && (
                      <button
                        onClick={() => handleKick(m.userId)}
                        title="Remove from club"
                        className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/20 transition-all"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
