import type { ActionDefinition } from "@w6w/types";
import { isoTimestamp, query, VantaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/event-logs` — who changed the compliance program.
 *
 * The audit trail for Vanta itself, and the reason it matters is specific: this
 * app can deactivate test entities and reassign controls, and so can everybody
 * with a Vanta login. An exception granted in March explains a green dashboard
 * in September, and this is where that decision is recorded.
 *
 * Streaming it into a SIEM is the obvious use, and `startDate` makes that
 * resumable — store the timestamp of the last event seen and pass it next run.
 *
 * The filter is a **start** date only; there is no end. So this reads forward
 * from a point, which is exactly the shape a tailing job wants and an awkward
 * one for a historical report.
 */
const action: ActionDefinition = {
  key: "event-log-list",
  type: "read",
  resource: "event-log",
  title: "List event logs",
  description:
    "Vanta's own audit trail — who granted an exception or reassigned a control. Reads forward " +
    "from a start date, which is the shape a tailing job wants.",
  params: [
    {
      key: "startDate",
      label: "From",
      type: "datetime",
      default: "",
      hint: "ISO 8601. Store the last event's timestamp and pass it next run to resume. There is " +
        "no end-date filter.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "count", type: "number", label: "Events returned" },
    { key: "hasNextPage", type: "boolean", label: "True when the walk stopped early" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new VantaClient(ctx);
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 100));

    const page = await client.pageAll(
      "/event-logs",
      {
        query: query({ startDate: isoTimestamp(p.startDate, "startDate") }),
      },
      want,
      Math.max(1, Number(p.maxPages ?? 50)),
    );

    ctx.log("info", "read Vanta event logs", { count: page.items.length });
    return { events: page.items, count: page.items.length, hasNextPage: page.hasNextPage };
  },
};

export default action;
