import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient } from "../lib/client.ts";
import { listOutput, pageCursorParam } from "../lib/params.ts";

/**
 * `GET /v2/analytics/member-activities` — workspace adoption data.
 *
 * The whole of the v2 Analytics API: one endpoint, three parameters. Read-only,
 * scoped to the workspace, and gated behind its own `analytics:read` scope
 * rather than the entity scopes — so a token that reads features happily may
 * still be refused here, and that is a scope problem rather than an outage.
 *
 * `dateFrom` / `dateTo` are plain **dates** (`format: date`), not date-times —
 * the only date parameters in v2 that are, since the note filters all take full
 * ISO 8601 timestamps.
 */
interface Input {
  dateFrom?: string;
  dateTo?: string;
  pageCursor?: string;
}

const memberActivityList: ActionDefinition<Input, ListResult> = {
  key: "member-activity-list",
  type: "search",
  resource: "analytics",
  title: "List member activities",
  description:
    "Workspace usage and engagement data per member, for adoption dashboards. Needs the " +
    "analytics:read scope, which is separate from the entity scopes.",
  params: [
    {
      key: "dateFrom",
      label: "From date",
      type: "date",
      hint: "A date (2026-01-01), not a timestamp — unlike the note filters.",
    },
    { key: "dateTo", label: "To date", type: "date" },
    pageCursorParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/analytics/member-activities", {
      query: {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        pageCursor: input.pageCursor,
      },
    });
  },
};

export default memberActivityList;
