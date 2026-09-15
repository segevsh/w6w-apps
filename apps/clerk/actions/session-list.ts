import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /sessions` — a bare array. Clerk's own deprecation notice (2024-01-01) says at least one of
 * `client_id` or `user_id` should now be provided; both were originally optional but an
 * unfiltered call is no longer the documented usage, so this action requires one of them rather
 * than silently sending neither.
 */
const action: ActionDefinition = {
  key: "session-list",
  type: "read",
  resource: "session",
  title: "List sessions",
  description: "List sessions for a given user or client. Old/inactive sessions are periodically " +
    "cleaned up and will not appear here.",
  params: [
    { key: "userId", label: "User ID", type: "string", default: "" },
    { key: "clientId", label: "Client ID", type: "string", default: "" },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "abandoned", label: "Abandoned" },
        { value: "active", label: "Active" },
        { value: "ended", label: "Ended" },
        { value: "expired", label: "Expired" },
        { value: "removed", label: "Removed" },
        { value: "replaced", label: "Replaced" },
        { value: "revoked", label: "Revoked" },
      ],
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Sessions" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = String(p.userId ?? "").trim();
    const clientId = String(p.clientId ?? "").trim();
    if (!userId && !clientId) {
      throw new Error(
        "provide at least a `userId` or a `clientId` — Clerk deprecated an " +
          "unfiltered session list",
      );
    }

    const data = await new ClerkClient(ctx).requestArray("/sessions", {
      query: {
        user_id: userId || undefined,
        client_id: clientId || undefined,
        status: p.status as string | undefined,
        limit: (p.limit as number | undefined) ?? 10,
        offset: (p.offset as number | undefined) ?? 0,
      },
    });
    return { data };
  },
};
export default action;
