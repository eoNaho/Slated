import { cookies } from "next/headers";
import type { WatchPartyRoom } from "@/lib/api";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

async function fetchJson<T>(
  endpoint: string,
  cookieHeader?: string
): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getRoom(code: string): Promise<WatchPartyRoom | null> {
  return fetchJson<WatchPartyRoom>(`/watch-party/rooms/${code}`);
}

export async function getMyRooms(): Promise<WatchPartyRoom[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const data = await fetchJson<{ rooms: WatchPartyRoom[] }>(
    "/watch-party/my-rooms",
    cookieHeader
  );
  return data?.rooms ?? [];
}
