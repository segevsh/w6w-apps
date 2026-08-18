import type { ActionDefinition } from "@w6w/types";
import { AshbyClient, compact } from "../lib/client.ts";

/**
 * `POST /archiveReason.list` — why candidates get rejected.
 *
 * Small endpoint, disproportionately important. `application-change-stage`
 * **requires** an archive reason when moving to an archived stage, so without
 * this a rejection cannot be recorded at all.
 *
 * More than that: these are the categories every funnel report is grouped by.
 * "Failed technical screen", "withdrew", "compensation", "accepted another
 * offer" — the difference between those is the difference between a hiring
 * problem and a compensation problem. A workflow that always passes the same
 * generic reason because it was easier destroys that analysis quietly, and
 * nobody notices until somebody asks why everyone is being rejected for the
 * same thing.
 *
 * This endpoint is **not paginated**.
 */
const action: ActionDefinition = {
  key: "archive-reason-list",
  type: "read",
  resource: "archive-reason",
  title: "List archive reasons",
  description:
    "Why candidates get rejected — required to archive an application, and the categories every " +
    "funnel report groups by. One generic reason for everything destroys that analysis.",
  params: [
    { key: "includeArchived", label: "Include Archived Reasons", type: "boolean", default: false },
  ],
  output: [
    { key: "reasons", type: "array", label: "Archive reasons" },
    { key: "count", type: "number", label: "Reasons returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const results = await new AshbyClient(ctx).request<unknown[]>("archiveReason.list", {
      body: compact({ includeArchived: p.includeArchived === true ? true : undefined }),
    });
    const reasons = Array.isArray(results) ? results : [];
    return { reasons, count: reasons.length };
  },
};

export default action;
