import { cookies } from "next/headers";
import { Sidebar } from "@/components/layout/sidebar";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(`${API_ORIGIN}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user?.role === "admin" ? data.user : null;
  } catch {
    return null;
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts (middleware) already handles auth redirect — this only fetches admin data for Sidebar
  const admin = await getAdminSession();

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      <Sidebar admin={admin} />
      <main className="flex-1 lg:ml-64 min-w-0 min-h-screen py-6 px-6 lg:py-10 lg:px-12 relative z-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
