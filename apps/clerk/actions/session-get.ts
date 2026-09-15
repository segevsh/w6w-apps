import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "session-get",
  type: "read",
  resource: "session",
  title: "Get session",
  description: "Retrieve a single session by ID.",
  params: [
    { key: "sessionId", label: "Session ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Session ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "user_id", type: "string", label: "User ID" },
  ],

  async execute(input, ctx) {
    const sessionId = String((input as Record<string, unknown>).sessionId ?? "").trim();
    if (!sessionId) throw new Error("`sessionId` is required");
    return await new ClerkClient(ctx).request(`/sessions/${encodeURIComponent(sessionId)}`);
  },
};
export default action;
