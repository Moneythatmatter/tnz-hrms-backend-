export const GRIEVANCE_STATUSES = ["Submitted", "Pending", "Closed"] as const;

export type GrievanceSimpleStatus = (typeof GRIEVANCE_STATUSES)[number];

export function normalizeGrievanceStatus(raw?: string | null): GrievanceSimpleStatus {
  const s = String(raw ?? "").trim();
  const lower = s.toLowerCase();
  if (lower === "closed" || lower === "resolved" || lower === "rejected") return "Closed";
  if (lower === "pending") return "Pending";
  if (lower === "submitted" || lower === "open" || s === "") return "Submitted";
  return "Pending";
}
