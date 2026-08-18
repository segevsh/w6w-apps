import type { ActionDefinition } from "@w6w/types";
import { MixpanelClient } from "../lib/client.ts";

/**
 * `GET /api/query/insights` — run a **saved report** and get its numbers.
 *
 * This is the endpoint to reach for first, and the one Mixpanel itself points
 * at. A report built in the Insights UI already encodes the events, the
 * breakdowns, the filters and the date logic that somebody in the company
 * agreed on; querying it by `bookmark_id` means a workflow returns *the same
 * number the dashboard shows*, and keeps returning it when the definition
 * changes.
 *
 * The alternative — rebuilding the same logic out of `segmentation-query`'s
 * parameters — puts a second definition of "active user" in a workflow, where
 * nobody will find it when the first one changes.
 *
 * It is also why this app does **not** implement the Funnels Query API:
 * Mixpanel has put that surface into maintenance mode and recommends building
 * the funnel as a report and querying it here instead.
 *
 * The `bookmark_id` is the number in the report's own URL.
 */
const action: ActionDefinition = {
  key: "insights-query",
  type: "read",
  resource: "report",
  title: "Query a saved report",
  description:
    "Run a saved Insights report by id and get exactly the numbers the dashboard shows — " +
    "rather than re-deriving them from raw parameters.",
  params: [
    {
      key: "bookmarkId",
      label: "Report ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "12345678",
      hint: "The `bookmark_id` in the Insights report's URL.",
    },
    {
      key: "workspaceId",
      label: "Workspace ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Only for projects that use workspaces.",
    },
  ],
  output: [
    { key: "computed_at", type: "string", label: "Computed at" },
    { key: "date_range", type: "object", label: "Date range" },
    { key: "headers", type: "array", label: "Headers" },
    { key: "series", type: "object", label: "Series" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const bookmarkId = String(p.bookmarkId ?? "").trim();
    if (!bookmarkId) throw new Error("`bookmarkId` is required");

    return await new MixpanelClient(ctx).request("/api/query/insights", {
      query: { bookmark_id: bookmarkId, workspace_id: String(p.workspaceId ?? "") || undefined },
    });
  },
};

export default action;
