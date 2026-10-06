import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";
import { requireString } from "../lib/params.ts";

interface Input {
  since: string;
  to?: string;
  includePending?: boolean;
}

/**
 * `GET /v1/timeoff/requests/changes` — every change to time off requests in a
 * window. `since` is required; without `to` only the last 6 months are covered,
 * and `to` must be after `since`. The right poll for "what changed since my last
 * run" — pass the previous run's timestamp as `since`.
 */
const timeoffRequestsChanges: ActionDefinition<Input> = {
  key: "timeoff-requests-changes",
  type: "read",
  resource: "timeoff",
  title: "List Time Off Request Changes",
  description: "List changes made to time off requests since a timestamp.",
  params: [
    {
      key: "since",
      label: "Since",
      type: "datetime",
      required: true,
      hint: "ISO 8601 timestamp, e.g. 2026-10-01T00:00:00Z.",
    },
    { key: "to", label: "To", type: "datetime", hint: "ISO 8601 timestamp, after Since." },
    { key: "includePending", label: "Include pending requests", type: "boolean", default: false },
  ],
  output: [{ key: "changes", type: "object", label: "Changes; shape varies by request type" }],

  async execute(input, ctx) {
    return await new HibobClient(ctx).get("/timeoff/requests/changes", {
      since: requireString(input.since, "since"),
      to: input.to,
      includePending: input.includePending ? true : undefined,
    });
  },
};

export default timeoffRequestsChanges;
