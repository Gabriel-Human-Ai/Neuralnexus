import { db } from "@/lib/db";

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}
