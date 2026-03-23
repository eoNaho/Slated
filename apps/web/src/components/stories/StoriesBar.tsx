"use client";

import * as React from "react";
import { StoryRing } from "./StoryRing";
import { Story } from "@/types/stories";
import { StoryViewer } from "./StoryViewer";
import { useSession } from "@/lib/auth-client";
import { CreateStoryModal } from "./CreateStoryModal";
import { useStoriesFeed } from "@/hooks/queries/use-stories";

interface UserWithStories {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  stories: Story[];
  hasUnseen: boolean;
}

export function StoriesBar() {
  const { data: session, isPending: sessionPending } = useSession();
  const [selectedUser, setSelectedUser] = React.useState<UserWithStories | null>(null);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  const isLoggedIn = !!session?.user;
  const { data: feedData, isLoading, refetch } = useStoriesFeed(1, isLoggedIn);

  const userGroups = React.useMemo<UserWithStories[]>(() => {
    if (!feedData?.data) return [];
    const groups = feedData.data.reduce(
      (acc: Record<string, UserWithStories>, story) => {
        const userId = story.userId;
        if (!acc[userId] && story.user) {
          acc[userId] = {
            userId,
            username: story.user.username ?? "",
            displayName: story.user.displayName ?? null,
            avatarUrl: story.user.avatarUrl ?? null,
            stories: [],
            hasUnseen: false,
          };
        }
        if (acc[userId]) {
          acc[userId].stories.push(story as unknown as Story);
          if (!story.hasViewed) acc[userId].hasUnseen = true;
        }
        return acc;
      },
      {},
    );
    return Object.values(groups);
  }, [feedData]);

  // Hide entirely for anonymous users
  if (!sessionPending && !isLoggedIn) return null;

  if (sessionPending || isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto no-scrollbar">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 animate-pulse"
          >
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="w-12 h-2 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-5 p-4 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/20 backdrop-blur-md">
        {/* Your Story Button */}
        {session?.user && (
          <div className="flex flex-col items-center gap-2">
            <StoryRing
              size="lg"
              avatarUrl={session.user.image}
              displayName={session.user.name}
              isCurrentUser={true}
              hasStories={false} // Would check if current user has active stories
              onClick={() => setIsCreateOpen(true)}
            />
            <span className="text-xs font-medium text-zinc-500 w-16 text-center">
              Your Story
            </span>
          </div>
        )}

        {userGroups.map((group) => (
          <div key={group.userId} className="flex flex-col items-center gap-2">
            <StoryRing
              size="lg"
              avatarUrl={group.avatarUrl}
              displayName={group.displayName}
              hasStories={true}
              hasUnseenStories={group.hasUnseen}
              onClick={() => setSelectedUser(group)}
            />
            <span className="text-xs font-medium text-zinc-300 truncate w-16 text-center">
              {group.displayName?.split(" ")[0] || group.username}
            </span>
          </div>
        ))}
      </div>

      {selectedUser && (
        <StoryViewer
          stories={selectedUser.stories}
          onClose={() => setSelectedUser(null)}
        />
      )}

      {isCreateOpen && (
        <CreateStoryModal
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => refetch()}
        />
      )}
    </>
  );
}
