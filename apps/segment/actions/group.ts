import type { ActionDefinition } from "@w6w/types";
import { buildCommon, compact, parseJsonParam, post, requireIdentity } from "../lib/client.ts";

/**
 * `POST /v1/group` — associates a user with a group (account, org, company).
 * https://segment.com/docs/connections/spec/group/ (verified 2026-08-01 via
 * the docs' Netlify mirror).
 *
 * `groupId` is required. Either `userId` or `anonymousId` is required.
 * `traits` is free-form; Segment reserves address, avatar, createdAt,
 * description, email, employees, id, industry, name, phone, website, plan.
 *
 * `idempotent: true` — see `identify.ts` for the `messageId`/dedupe rationale.
 */
const action: ActionDefinition = {
  key: "group",
  type: "perform",
  resource: "group",
  title: "Group",
  description: "Associate a user with a group — a company, team, or account.",
  idempotent: true,
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      required: true,
      hint: "Unique identifier for the group in your database.",
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
      key: "traits",
      label: "Traits",
      type: "json",
      hint:
        'Free-form group attributes, e.g. { "name": "Acme", "plan": "enterprise" }. Segment reserves ' +
        "address, avatar, createdAt, description, email, employees, id, industry, name, phone, website, plan.",
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
    const groupId = typeof p.groupId === "string" ? p.groupId.trim() : "";
    if (!groupId) throw new Error("`groupId` is required");

    const userId = typeof p.userId === "string" && p.userId ? p.userId : undefined;
    const anonymousId = typeof p.anonymousId === "string" && p.anonymousId
      ? p.anonymousId
      : undefined;
    requireIdentity(userId, anonymousId);

    const body = compact({
      groupId,
      userId,
      anonymousId,
      traits: parseJsonParam(p.traits),
      ...buildCommon(p, ctx),
    });

    ctx.log("info", "Segment group", { groupId, userId, anonymousId });
    return await post(ctx, "/group", body);
  },
};

export default action;
