import type { RedactedConnection } from "@w6w/types";

export { BASE_URL } from "./client.ts";

/** The environment recorded on a Connection at connect time. */
export function displayEnvironment(connection: RedactedConnection | undefined): string {
  const display = (connection?.display ?? {}) as { environment?: string };
  return String(display.environment ?? "unknown");
}
