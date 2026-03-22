"use client";

import { useState, useEffect } from "react";
import { Mail, Check, X, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { clubsApi } from "@/lib/api";
import { resolveImage } from "@/lib/utils";
import type { ClubInvite } from "@/types";

export default function ClubInvitesPage() {
  const [invites, setInvites] = useState<ClubInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    clubsApi.getInvites().then((res) => {
      setInvites(res.data);
      setLoading(false);
    });
  }, []);

  const handle = async (inviteId: string, action: "accept" | "decline") => {
    setProcessingId(inviteId);
    try {
      if (action === "accept") {
        await clubsApi.acceptInvite(inviteId);
      } else {
        await clubsApi.declineInvite(inviteId);
      }
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    } catch {
      // silently fail
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      {/* Header */}
      <div className="border-b border-white/5 bg-zinc-900/50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-6 w-6 text-purple-400" />
            <h1 className="text-2xl font-bold">Club Invites</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            Pending invitations to join clubs.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-8">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : invites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-5">
              <Mail className="h-7 w-7 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No pending invites</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              When someone invites you to a club, it will appear here.
            </p>
            <Link
              href="/clubs"
              className="mt-6 flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-colors"
            >
              <Users className="h-4 w-4" />
              Browse clubs
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900/50 border border-white/5"
              >
                {/* Club cover */}
                <Link href={`/clubs/${invite.club.slug}`} className="shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden">
                    {invite.club.coverUrl ? (
                      <Image
                        src={resolveImage(invite.club.coverUrl, "w185") || ""}
                        alt={invite.club.name}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-zinc-600" />
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/clubs/${invite.club.slug}`}>
                    <p className="font-bold text-white hover:text-purple-400 transition-colors truncate">
                      {invite.club.name}
                    </p>
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Invited by{" "}
                    <Link
                      href={`/profile/${invite.invitedBy.username}`}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      @{invite.invitedBy.username}
                    </Link>
                    {invite.club.memberCount != null && (
                      <> · {invite.club.memberCount} members</>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handle(invite.id, "decline")}
                    disabled={processingId === invite.id}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-colors disabled:opacity-30"
                    title="Decline"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handle(invite.id, "accept")}
                    disabled={processingId === invite.id}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors disabled:opacity-30 flex items-center gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
