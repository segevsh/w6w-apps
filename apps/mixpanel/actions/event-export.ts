import type { ActionDefinition } from "@w6w/types";
import { csv, MixpanelClient, queryDate } from "../lib/client.ts";
import { DATE_RANGE_PARAMS, WHERE_PARAM } from "../lib/params.ts";

/**
 * `GET /api/2.0/export` on the **export host** — raw events, one JSON object
 * per line.
 *
 * Three things make this endpoint unlike every other one in this app:
 *
 *   - **It runs on its own hosts** (`data.mixpanel.com`, `data-eu`, `data-in`)
 *     and its own rate budget — 60 an hour, 3 a second, 100 concurrent —
 *     separate from the Query API's sixty.
 *   - **It answers JSONL, not JSON.** One event per line, no enclosing array,
 *     so `JSON.parse` on the whole body fails on the second line. The client
 *     parses it line by line for that reason.
 *   - **Its dates are UTC**, while the query endpoints use the project's
 *     timezone. At a day boundary the two disagree, which is exactly the kind
 *     of difference that makes a reconciliation off by one day's events.
 *
 * It returns raw events with every property, which is what makes it the right
 * tool for exporting into a warehouse or an audit — and the wrong tool for a
 * count, which `segmentation-query` answers with one small response instead of
 * a hundred thousand lines.
 *
 * `limit` caps the events returned at Mixpanel's own ceiling of 100,000.
 */
const action: ActionDefinition = {
  key: "event-export",
  type: "read",
  resource: "event",
  title: "Export raw events",
  description:
    "Raw events with every property, as JSONL from Mixpanel's export hosts. Dates are UTC here " +
    "and project-local everywhere else — which matters at a day boundary.",
  params: [
    ...DATE_RANGE_PARAMS,
    {
      key: "events",
      label: "Events",
      type: "string",
      default: "",
      placeholder: "Signed Up,Purchased",
      hint: "Comma-separated. Empty exports every event, which is a lot of lines.",
    },
    WHERE_PARAM,
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10000,
      hint: "Mixpanel's ceiling is 100,000 events per export.",
    },
    {
      key: "timeInMs",
      label: "Millisecond Timestamps",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Off, `time` comes back in seconds — which is not what the import endpoint's " +
        "examples use, so a round trip needs care.",
    },
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "count", type: "number", label: "Events returned" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const from = queryDate(p.fromDate, "fromDate");
    const to = queryDate(p.toDate, "toDate");
    if (!from || !to) throw new Error("`fromDate` and `toDate` are both required");
    const limit = Number(p.limit ?? 10000);
    if (Number.isFinite(limit) && limit > 100000) {
      throw new Error("Mixpanel's export ceiling is 100,000 events per call");
    }
    const events = csv(p.events);

    ctx.log("info", "exporting raw Mixpanel events", { from, to, limit });

    // JSONL, not JSON — see the client's requestJsonl.
    const rows = await new MixpanelClient(ctx).requestJsonl("/api/2.0/export", {
      plane: "export",
      query: {
        from_date: from,
        to_date: to,
        // A JSON array inside a query parameter, like the activity stream's ids.
        event: events ? JSON.stringify(events) : undefined,
        where: String(p.where ?? "") || undefined,
        limit: Number.isFinite(limit) && limit > 0 ? limit : undefined,
        time_in_ms: p.timeInMs === true ? "true" : undefined,
      },
    });
    return { events: rows, count: rows.length };
  },
};

export default action;
