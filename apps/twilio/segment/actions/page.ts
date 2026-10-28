import type { ActionDefinition } from "@w6w/types";
import { buildCommon, compact, parseJsonParam, post, requireIdentity } from "../lib/client.ts";

/**
 * `POST /v1/page` — records a page view.
 * https://segment.com/docs/connections/spec/page/ (verified 2026-08-01 via
 * the docs' Netlify mirror).
 *
 * Either `userId` or `anonymousId` is required; `name` and `category` are
 * both optional. The wire payload has no top-level `category` field — the
 * spec says category is "added to the properties object", and the documented
 * JSON example confirms it: only `name` sits alongside `properties`, `context`
 * etc. So this action folds `category` into `properties.category` itself
 * before sending, the same merge client libraries (e.g. analytics.js's
 * `page(category, name, properties)`) perform before the call reaches the
 * wire — rather than inventing a top-level field the raw API doesn't have.
 *
 * `idempotent: true` — see `identify.ts` for the `messageId`/dedupe rationale.
 */
const action: ActionDefinition = {
  key: "page",
  type: "perform",
  resource: "page",
  title: "Track Page",
  description: "Record a page view.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: 'Name of the page, e.g. "Signup".',
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "Sent as `properties.category` — the Tracking API has no top-level category field.",
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
      hint: 'Free-form page properties, e.g. { "url": "...", "referrer": "...", "title": "..." }.',
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

    const name = typeof p.name === "string" && p.name ? p.name : undefined;
    const category = typeof p.category === "string" && p.category ? p.category : undefined;
    const properties = parseJsonParam(p.properties);
    const propertiesWithCategory = category ? { ...(properties ?? {}), category } : properties;

    const body = compact({
      name,
      userId,
      anonymousId,
      properties: propertiesWithCategory,
      ...buildCommon(p, ctx),
    });

    ctx.log("info", "Segment page", { name, userId, anonymousId });
    return await post(ctx, "/page", body);
  },
};

export default action;
