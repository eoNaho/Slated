import type { Metadata } from "next";
import { AuditLogTable } from "./audit-log-table";

export const metadata: Metadata = { title: "Audit Logs — PixelReel Command" };

export default function AuditLogsPage() {
  return <AuditLogTable />;
}
