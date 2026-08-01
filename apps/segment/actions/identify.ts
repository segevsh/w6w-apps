import type { ActionDefinition } from "@w6w/types";
import { buildCommon, compact, parseJsonParam, post, requireIdentity } from "../lib/client.ts";

/**
 * `POST /v1/identify` — ties a user to their traits.
 * https://segment.com/docs/connections/spec/identify/ (verified 2026-08-01
 * via the docs' Netlify mirror; segment.com itself 403s automated fetches).
 *
 * Either `userId` or `anonymousId` is required. `traits` is a free-form
 * object; Segment reserves a handful of names destinations understand
 * specially (email, name, firstName, lastName, phone, address, company,
 * avatar, createdAt, username, age, title) but accepts any key.
 *
 * `idempotent: true` — `messageId` is stamped from the invocation id (see
 * `lib/client.ts#buildCommon`), so a host retry updates the same traits twice
 * rather than being interpreted as two events.
 */
const action: ActionDefinition = {
  key: "identify",
  type: "perform",
  resource: "identify",
  title: "Identify",
  description: "Tie a user to their traits (name, email, plan, …).",
  idempotent: true,
  params: [
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
      key: "traits",
      label: "Traits",
      type: "json",
      hint:
        'Free-form user attributes, e.g. { "email": "a@b.com", "plan": "pro" }. Segment reserves ' +
        "email, name, firstName, lastName, phone, address, company, avatar, createdAt, username, age, title.",
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
    const userId = typeof p.userId === "string" && p.userId ? p.userId : undefined;
    const anonymousId = typeof p.anonymousId === "string" && p.anonymousId
      ? p.anonymousId
      : undefined;
    requireIdentity(userId, anonymousId);

    const body = compact({
      userId,
      anonymousId,
      traits: parseJsonParam(p.traits),
      ...buildCommon(p, ctx),
    });

    ctx.log("info", "Segment identify", { userId, anonymousId });
    return await post(ctx, "/identify", body);
  },
};

export default action;
