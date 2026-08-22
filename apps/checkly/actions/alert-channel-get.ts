import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/alert-channels/{id}` — verified against Checkly's OpenAPI document
 * (`getV1AlertchannelsId`).
 *
 * The field worth reading is `sendRecovery`. A channel that sends failures but
 * not recoveries leaves an incident channel looking permanently on fire, and
 * one that sends neither is subscribed to nothing useful — both are
 * configuration, not bugs, and both are invisible until you look here.
 */
const action: ActionDefinition = {
  key: "alert-channel-get",
  type: "read",
  resource: "alert-channel",
  title: "Get an alert channel",
  description: "One alert channel, including which event kinds it actually sends.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Channel id" },
    { key: "type", type: "string", label: "EMAIL, SLACK, WEBHOOK, PAGERDUTY, OPSGENIE, …" },
    { key: "config", type: "object", label: "Channel configuration" },
    { key: "sendRecovery", type: "boolean", label: "Sends recoveries as well as failures" },
    { key: "sendFailure", type: "boolean", label: "Sends failures" },
    { key: "sendDegraded", type: "boolean", label: "Sends degradations" },
    { key: "sslExpiry", type: "boolean", label: "Sends SSL expiry warnings" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.channelId ?? "").trim();
    if (!id) throw new Error("`channelId` is required");

    ctx.log("info", "getting a Checkly alert channel", { id });

    return await new ChecklyClient(ctx).request(`/v1/alert-channels/${encodeURIComponent(id)}`);
  },
};

export default action;
