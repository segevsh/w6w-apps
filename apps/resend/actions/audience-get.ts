import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /audiences/{id}` — verified against Resend's OpenAPI document.
 */
const action: ActionDefinition = {
  key: "audience-get",
  type: "read",
  resource: "audience",
  title: "Get an audience",
  description: "Retrieve one audience by ID.",
  params: [
    { key: "audienceId", label: "Audience ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Audience ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const audienceId = String(p.audienceId ?? "").trim();
    if (!audienceId) throw new Error("`audienceId` is required");

    ctx.log("info", "getting Resend audience", { audienceId });
    return await new ResendClient(ctx).request(`/audiences/${encodeURIComponent(audienceId)}`);
  },
};

export default action;
