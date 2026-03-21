import type { Person, Credit } from "@/types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export async function getPerson(id: string): Promise<{
  person: Person;
  credits: Credit[];
} | null> {
  try {
    const response = await fetch(`${API_URL}/people/${id}`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
