import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, query } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/events` — what EasyPost has told you, whether or not you heard it.
 *
 * EasyPost's normal delivery mechanism is a webhook, and this is the record
 * behind it. That matters for one specific failure: **a webhook endpoint that
 * was down did not queue anything on your side**, and the tracking updates,
 * refund outcomes and batch completions that happened meanwhile are only here.
 *
 * So the recovery shape is: read events since the outage, replay them, carry
 * on. Without this an hour of downtime is an hour of parcels whose status
 * silently stopped updating.
 *
 * It is also the audit trail — `tracker.updated`, `shipment.purchased`,
 * `refund.successful` — for reconstructing what happened to an order when a
 * customer asks.
 */
const action: ActionDefinition = {
  key: "event-list",
  type: "read",
  resource: "event",
  title: "List events",
  description:
    "Everything EasyPost emitted, webhook or not. The only way to recover updates missed while " +
    "an endpoint was down — nothing queues them on your side.",
  params: [
    { key: "startDatetime", label: "From", type: "datetime", default: "" },
    { key: "endDatetime", label: "To", type: "datetime", default: "" },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "events", type: "array", label: "Events" },
    { key: "count", type: "number", label: "Events returned" },
    { key: "typeCounts", type: "object", label: "How many of each type" },
    { key: "has_more", type: "boolean", label: "More exist beyond this page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const body = await new EasyPostClient(ctx).request<{
      events?: Array<{ description?: string }>;
      has_more?: boolean;
    }>("/events", {
      query: query({
        start_datetime: p.startDatetime,
        end_datetime: p.endDatetime,
        page_size: Math.min(100, Math.max(1, Number(p.limit ?? 20))),
        before_id: p.beforeId,
      }),
    });

    const events = body?.events ?? [];
    const typeCounts: Record<string, number> = {};
    for (const e of events) {
      const type = String(e?.description ?? "unknown");
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }

    ctx.log("info", "read EasyPost events", { count: events.length });
    return { events, count: events.length, typeCounts, has_more: body?.has_more === true };
  },
};

export default action;
