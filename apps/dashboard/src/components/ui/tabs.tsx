"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={`flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10 ${className}`}
      {...props}
    />
  );
}

export function TabsTrigger({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-zinc-500 transition-all data-[state=active]:bg-accent/20 data-[state=active]:text-white data-[state=active]:shadow-sm hover:text-zinc-300 ${className}`}
      {...props}
    />
  );
}

export function TabsContent({
  className = "",
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={`focus-visible:outline-none ${className}`}
      {...props}
    />
  );
}
