import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/check-groups/{id}` — verified against Checkly's OpenAPI document
 * (`getV1CheckgroupsId`).
 *
 * **A group's settings override its members'.** Locations, frequency, retry
 * strategy and alert channels set on the group apply to every check in it — so
 * "why does this check run from Frankfurt when I set it to Dublin" is answered
 * here, not on the check.
 */
const action: ActionDefinition = {
  key: "check-group-get",
  type: "read",
  resource: "check-group",
  title: "Get a check group",
  description: "One group and the settings it imposes on its members.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Group id" },
    { key: "name", type: "string", label: "Name" },
    { key: "activated", type: "boolean", label: "Running" },
    { key: "muted", type: "boolean", label: "Muted" },
    { key: "locations", type: "array", label: "Locations — these override the members'" },
    { key: "concurrency", type: "number", label: "How many members run at once" },
    { key: "alertChannelSubscriptions", type: "array", label: "Where the group's alerts go" },
    { key: "environmentVariables", type: "array", label: "Variables its checks can read" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.groupId ?? "").trim();
    if (!id) throw new Error("`groupId` is required");

    ctx.log("info", "getting a Checkly check group", { id });

    return await new ChecklyClient(ctx).request(`/v1/check-groups/${encodeURIComponent(id)}`);
  },
};

export default action;
