import { cookies } from "next/headers";
import { SettingsClient } from "./settings-client";

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:3001";

async function getSession() {
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");
    const res = await fetch(`${API_ORIGIN}/api/auth/get-session`, {
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const user = await getSession();
  return <SettingsClient user={user} />;
}
