import type { ActionDefinition } from "@w6w/types";
import { compact, ResendClient } from "../lib/client.ts";

/**
 * `POST /broadcasts/{id}/send` — verified against Resend's OpenAPI document,
 * whose only body field is the optional `scheduled_at`. Omit it to send now.
 */
const action: ActionDefinition = {
  key: "broadcast-send",
  type: "perform",
  resource: "broadcast",
  title: "Send a broadcast",
  description: "Send a drafted broadcast now, or schedule it.",
  // Sending a broadcast reaches an audience once; a retry after success is
  // rejected by Resend rather than re-sending, but this is not a safe blind
  // replay and is marked accordingly.
  idempotent: false,
  params: [
    { key: "broadcastId", label: "Broadcast ID", type: "string", required: true, default: "" },
    {
      key: "scheduledAt",
      label: "Send At",
      type: "string",
      default: "",
      placeholder: "in 1 hour",
      hint: "Leave blank to send immediately.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Broadcast ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const broadcastId = String(p.broadcastId ?? "").trim();
    if (!broadcastId) throw new Error("`broadcastId` is required");

    const body = compact({ scheduled_at: p.scheduledAt });

    ctx.log("info", "sending Resend broadcast", { broadcastId, scheduled: !!p.scheduledAt });

    return await new ResendClient(ctx).request(
      `/broadcasts/${encodeURIComponent(broadcastId)}/send`,
      { method: "POST", body },
    );
  },
};

export default action;
