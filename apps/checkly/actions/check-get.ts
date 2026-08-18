import type { ActionDefinition } from "@w6w/types";
import { ChecklyClient } from "../lib/client.ts";

/**
 * `GET /v1/checks/{id}` — verified against Checkly's OpenAPI document
 * (`getV1ChecksId`).
 */
const action: ActionDefinition = {
  key: "check-get",
  type: "read",
  resource: "check",
  title: "Get a check",
  description: "Retrieve one monitor and its configuration.",
  params: [
    { key: "checkId", label: "Check ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Check ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "checkType", type: "string", label: "Type" },
    { key: "activated", type: "boolean", label: "Running — a deactivated check monitors nothing" },
    { key: "muted", type: "boolean", label: "Muted — runs but does not alert" },
    { key: "frequency", type: "number", label: "How often it runs, in minutes" },
    { key: "locations", type: "array", label: "Locations it runs from" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "groupId", type: "number", label: "Group, when it belongs to one" },
    { key: "alertChannelSubscriptions", type: "array", label: "Where its alerts go" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.checkId ?? "").trim();
    if (!id) throw new Error("`checkId` is required");

    ctx.log("info", "getting a Checkly check", { id });

    return await new ChecklyClient(ctx).request(`/v1/checks/${encodeURIComponent(id)}`);
  },
};

export default action;
