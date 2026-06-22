import { db } from "@workspace/db";
import { analyticsEventsTable } from "@workspace/db";

export function logEvent(
  userId: number | null,
  eventType: string,
  metadata?: Record<string, unknown>
): void {
  db.insert(analyticsEventsTable)
    .values({ userId, eventType, metadata: metadata ?? null })
    .catch(() => {});
}
