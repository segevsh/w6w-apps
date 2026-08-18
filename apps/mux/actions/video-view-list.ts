import type { ActionDefinition } from "@w6w/types";
import { csv, MuxClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /data/v1/video-views` — individual viewing sessions.
 *
 * Where `metric-get` gives an aggregate, this gives the sessions behind it —
 * one row per person watching one video once, with their browser, their
 * connection, what failed and when.
 *
 * That makes it the support tool: when somebody says "the video would not play
 * for me", this is the record of what actually happened to them, rather than an
 * average that says most people were fine.
 *
 * `viewer_experience_score` summarises a session in one number, and the
 * `error_type_id` on a failed view is what distinguishes "their network" from
 * "our encoding".
 *
 * Views are retained by plan and are not an archive — a support workflow should
 * read them promptly rather than assume they will be there next month.
 */
const action: ActionDefinition = {
  key: "video-view-list",
  type: "read",
  resource: "metric",
  title: "List video views",
  description:
    "Individual viewing sessions with what failed and when — the record behind 'it would not " +
    "play for me', where an aggregate says most people were fine.",
  params: [
    {
      key: "timeframe",
      label: "Timeframe",
      type: "string",
      default: "7:days",
      hint: "`24:hours`, `7:days`, or two Unix timestamps.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "string",
      default: "",
      placeholder: "asset_id:abc123,country:GB",
      hint: "Comma-separated `field:value` pairs — narrowing to one asset or one viewer is the " +
        "usual reason to call this.",
    },
    {
      key: "orderBy",
      label: "Order By",
      type: "string",
      default: "",
      advanced: true,
      placeholder: "view_start",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "views", type: "array", label: "Video views" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    const views = await new MuxClient(ctx).requestAll("/data/v1/video-views", {
      query: {
        "timeframe[]": String(p.timeframe ?? "7:days"),
        order_by: String(p.orderBy ?? "") || undefined,
        ...Object.fromEntries((csv(p.filters) ?? []).map((f, i) => [`filters[${i}]`, f])),
      },
    }, returnAll ? Infinity : limit);
    return { views };
  },
};

export default action;
