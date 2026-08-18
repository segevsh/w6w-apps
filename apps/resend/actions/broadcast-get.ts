import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /broadcasts/{id}` — verified against Resend's OpenAPI document.
 */
const action: ActionDefinition = {
  key: "broadcast-get",
  type: "read",
  resource: "broadcast",
  title: "Get a broadcast",
  description: "Retrieve one broadcast and its status.",
  params: [
    { key: "broadcastId", label: "Broadcast ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Broadcast ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "from", type: "string", label: "From" },
    { key: "audience_id", type: "string", label: "Audience ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "scheduled_at", type: "string", label: "Scheduled at" },
    { key: "sent_at", type: "string", label: "Sent at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const broadcastId = String(p.broadcastId ?? "").trim();
    if (!broadcastId) throw new Error("`broadcastId` is required");

    ctx.log("info", "getting Resend broadcast", { broadcastId });
    return await new ResendClient(ctx).request(`/broadcasts/${encodeURIComponent(broadcastId)}`);
  },
};

export default action;
