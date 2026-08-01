import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, regionFromConnection, request } from "../lib/client.ts";

/**
 * `POST /customers/:id/events` — record an event for a known person.
 * Verified 2026-08-01 against the official `customerio-node` SDK
 * (`TrackClient.track`): the body is `{ name, data?, type? }`, `name` is the
 * only required key.
 *
 * `data` carries event-specific attributes, e.g. `{ price: "23.45" }`. `type`
 * changes the event's kind — set it to `"page"` to record a page view (the
 * SDK's own `trackPageView` is exactly `track(id, { type: "page", name: url })`).
 *
 * `idempotent: false` — the Track API documents no event id / dedupe key on
 * this endpoint (unlike Segment's `messageId`), so every accepted POST
 * creates a new, distinct event; a retry would double-fire it.
 */
const track: ActionDefinition = {
  key: "track",
  type: "perform",
  resource: "event",
  title: "Track Event",
  description: "Record an event for a known person.",
  idempotent: false,
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      required: true,
      hint: "The person's unique identifier.",
    },
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      hint: 'Name of the event, e.g. "purchase".',
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      hint: 'Event-specific attributes, e.g. { "price": "23.45", "product": "socks" }.',
    },
    {
      key: "eventType",
      label: "Event Type",
      type: "string",
      hint: 'Set to "page" to record a page view instead of a generic event.',
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const personId = typeof p.personId === "string" ? p.personId.trim() : "";
    if (!personId) throw new Error("`personId` is required");
    const eventName = typeof p.eventName === "string" ? p.eventName.trim() : "";
    if (!eventName) throw new Error("`eventName` is required");

    const body: Record<string, unknown> = { name: eventName };
    const data = parseJsonParam(p.data);
    if (data) body.data = data;
    if (typeof p.eventType === "string" && p.eventType) body.type = p.eventType;

    ctx.log("info", "Customer.io track", { personId, eventName });
    const region = regionFromConnection(ctx.connection);
    return await request(
      ctx,
      region,
      "POST",
      `/customers/${encodeURIComponent(personId)}/events`,
      body,
    );
  },
};

export default track;
