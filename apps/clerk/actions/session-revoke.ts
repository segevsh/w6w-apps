import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";

/**
 * `POST /sessions/{session_id}/revoke` — moves the session to an unauthenticated `revoked` state.
 * In multi-session mode the session object still shows up client-side alongside its device/client,
 * but the user must sign in again to use it.
 */
const action: ActionDefinition = {
  key: "session-revoke",
  type: "perform",
  resource: "session",
  title: "Revoke session",
  description: "Revoke a session, signing the user out of that device.",
  idempotent: true,
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const sessionId = String((input as Record<string, unknown>).sessionId ?? "").trim();
    if (!sessionId) throw new Error("`sessionId` is required");
    return await new ClerkClient(ctx).request(`/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: "POST",
    });
  },
};
export default action;
