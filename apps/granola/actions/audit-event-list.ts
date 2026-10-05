import type { ActionDefinition } from "@w6w/types";
import { GranolaClient } from "../lib/client.ts";
import { cursorParam, pageSizeParam } from "../lib/params.ts";

/**
 * `GET /v1/audit` — the workspace audit log, one page, in `collected_at` order.
 *
 * Retention is one year: an `occurred_after`/`occurred_before` earlier than that
 * is rejected (400). Each event's `data` is camelCase and its shape depends on
 * `action`; `action` is an open set, so it is a free string here, and a prefix
 * filter (`workspace` matches `workspace.member_added` but not
 * `workspace_automation.created`).
 */
interface Input {
  action?: string;
  occurredBefore?: string;
  occurredAfter?: string;
  cursor?: string;
  pageSize?: number;
}

const auditEventList: ActionDefinition<Input> = {
  key: "audit-event-list",
  type: "read",
  resource: "audit",
  title: "List Audit Events",
  description: "Read the workspace audit log (one-year retention), filterable by action and date.",
  params: [
    {
      key: "action",
      label: "Action",
      type: "string",
      placeholder: "workspace.member_added",
      hint: "Exact action, or a prefix followed by a dot. Lowercase.",
      validation: { pattern: "^[a-z][a-z0-9_.-]*$" },
    },
    {
      key: "occurredAfter",
      label: "Occurred after",
      type: "string",
      hint: "Date or timestamp, within the last year.",
    },
    { key: "occurredBefore", label: "Occurred before", type: "string" },
    cursorParam,
    pageSizeParam(30, "audit events"),
  ],
  output: [
    { key: "events", type: "array", label: "Audit events" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request("/audit", {
      query: {
        action: input.action,
        occurred_before: input.occurredBefore,
        occurred_after: input.occurredAfter,
        cursor: input.cursor,
        page_size: input.pageSize,
      },
    });
  },
};

export default auditEventList;
