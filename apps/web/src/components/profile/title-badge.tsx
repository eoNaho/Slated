import { cn } from "@/lib/utils";
import type { ProfileTitle } from "@/types";

interface TitleBadgeProps {
  title: Pick<ProfileTitle, "name" | "bgColor" | "textColor">;
  className?: string;
  size?: "sm" | "md";
}

export function TitleBadge({ title, className, size = "md" }: TitleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full",
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: title.bgColor,
        color: title.textColor,
      }}
    >
      {title.name}
    </span>
  );
}
