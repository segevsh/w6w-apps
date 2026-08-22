import type { ActionDefinition } from "@w6w/types";
import { LaunchDarklyClient } from "../lib/client.ts";

/**
 * `GET /auditlog/{id}` — verified against LaunchDarkly's OpenAPI document
 * (`getAuditLogEntry`).
 *
 * The full entry, including the **before and after states** of whatever
 * changed — which the list does not carry. That diff is the thing an incident
 * review actually wants: not "someone patched the flag" but which variation it
 * was serving before.
 */
const action: ActionDefinition = {
  key: "audit-log-get",
  type: "read",
  resource: "audit-log",
  title: "Get an audit log entry",
  description: "One entry with the before and after states the list omits.",
  params: [
    { key: "entryId", label: "Entry ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "_id", type: "string", label: "Entry id" },
    { key: "date", type: "number", label: "When (epoch milliseconds)" },
    { key: "member", type: "object", label: "Who" },
    { key: "token", type: "object", label: "Which token, when it was an API change" },
    { key: "titleVerb", type: "string", label: "What kind of change" },
    { key: "comment", type: "string", label: "The comment, if one was given" },
    { key: "previousVersion", type: "object", label: "The state before" },
    { key: "currentVersion", type: "object", label: "The state after" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.entryId ?? "").trim();
    if (!id) throw new Error("`entryId` is required");

    ctx.log("info", "getting a LaunchDarkly audit log entry", { id });

    return await new LaunchDarklyClient(ctx).request(`/auditlog/${encodeURIComponent(id)}`);
  },
};

export default action;
