import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, regionFromConnection, request } from "../lib/client.ts";

/**
 * `POST /events` — record an event for an anonymous (not-yet-identified)
 * person. Verified 2026-08-01 against the official `customerio-node` SDK
 * (`TrackClient.trackAnonymous`): the body is `{ name, data?, anonymous_id? }`
 * — `anonymous_id` is included only when non-empty, exactly what leaving the
 * "Anonymous ID" param blank does here.
 *
 * Anonymous events cannot trigger campaigns on their own. If [event
 * merging](https://customer.io/docs/anonymous-events/#turn-on-merging) is on
 * and a later `identify` call sets a matching `anonymous_id` attribute within
 * the following 72 hours, the event is associated with that person and can
 * then trigger a campaign.
 *
 * **Anonymous invite events**: leave "Anonymous ID" blank and include a
 * `recipient` key in Data to send an invite event
 * (https://customer.io/docs/anonymous-invite-emails/).
 *
 * `idempotent: false` — same reasoning as `track`: no documented event id /
 * dedupe key, so a retry creates a second event.
 */
const trackAnonymous: ActionDefinition = {
  key: "track-anonymous",
  type: "perform",
  resource: "event",
  title: "Track Anonymous Event",
  description: "Record an event for a not-yet-identified person.",
  idempotent: false,
  params: [
    {
      key: "anonymousId",
      label: "Anonymous ID",
      type: "string",
      hint: "Identifier for the anonymous person. Leave blank (with a `recipient` in Data) to " +
        "send an anonymous invite event instead.",
    },
    {
      key: "eventName",
      label: "Event Name",
      type: "string",
      required: true,
      hint: 'Name of the event, e.g. "signed_up".',
    },
    {
      key: "data",
      label: "Data",
      type: "json",
      hint: 'Event-specific attributes, e.g. { "plan": "free" }.',
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const eventName = typeof p.eventName === "string" ? p.eventName.trim() : "";
    if (!eventName) throw new Error("`eventName` is required");

    const body: Record<string, unknown> = { name: eventName };
    const data = parseJsonParam(p.data);
    if (data) body.data = data;
    if (typeof p.anonymousId === "string" && p.anonymousId) body.anonymous_id = p.anonymousId;

    ctx.log("info", "Customer.io track anonymous", { eventName });
    const region = regionFromConnection(ctx.connection);
    return await request(ctx, region, "POST", "/events", body);
  },
};

export default trackAnonymous;
