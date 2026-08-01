import type { ActionDefinition } from "@w6w/types";
import { buildCommon, compact, parseJsonParam, post, requireIdentity } from "../lib/client.ts";

/**
 * `POST /v1/track` — records an action a user performed.
 * https://segment.com/docs/connections/spec/track/ (verified 2026-08-01 via
 * the docs' Netlify mirror).
 *
 * `event` is required; either `userId` or `anonymousId` is required.
 * `properties` is free-form; Segment reserves `revenue` (Number), `currency`
 * (ISO 4217 code) and `value` (Number) for e-commerce/analytics destinations.
 *
 * `idempotent: true` — see `identify.ts` for the `messageId`/dedupe rationale.
 */
const action: ActionDefinition = {
  key: "track",
  type: "perform",
  resource: "track",
  title: "Track Event",
  description: "Record an action a user performed.",
  idempotent: true,
  params: [
    {
      key: "event",
      label: "Event",
      type: "string",
      required: true,
      hint: 'Name of the action performed, e.g. "Order Completed".',
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      hint: "Unique identifier in your database. Required if Anonymous ID is not set.",
    },
    {
      key: "anonymousId",
      label: "Anonymous ID",
      type: "string",
      hint:
        "Pseudo-unique identifier when the user isn't known yet. Required if User ID is not set.",
    },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      hint: 'Event-specific data, e.g. { "revenue": 9.99, "currency": "USD" }. Segment reserves ' +
        "revenue, currency and value.",
    },
    {
      key: "context",
      label: "Context",
      type: "json",
      hint: 'Environmental metadata: { "ip", "locale", "timezone", "page": {...}, "app": {...}, ' +
        '"campaign": {...}, "device": {...} }.',
    },
    {
      key: "integrations",
      label: "Integrations",
      type: "json",
      hint: 'Destination routing, e.g. { "All": true, "Salesforce": false }.',
    },
    {
      key: "timestamp",
      label: "Timestamp",
      type: "datetime",
      hint: "ISO-8601. Defaults to now if omitted.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Segment" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const event = typeof p.event === "string" ? p.event.trim() : "";
    if (!event) throw new Error("`event` is required");

    const userId = typeof p.userId === "string" && p.userId ? p.userId : undefined;
    const anonymousId = typeof p.anonymousId === "string" && p.anonymousId
      ? p.anonymousId
      : undefined;
    requireIdentity(userId, anonymousId);

    const body = compact({
      event,
      userId,
      anonymousId,
      properties: parseJsonParam(p.properties),
      ...buildCommon(p, ctx),
    });

    ctx.log("info", "Segment track", { event, userId, anonymousId });
    return await post(ctx, "/track", body);
  },
};

export default action;
