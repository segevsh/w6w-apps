import type { ActionDefinition } from "@w6w/types";
import { buildCommon, compact, post } from "../lib/client.ts";

/**
 * `POST /v1/alias` — merges two previously unassociated user identities.
 * https://segment.com/docs/connections/spec/alias/ (verified 2026-08-01 via
 * the docs' Netlify mirror, and cross-checked against a documented raw curl
 * example: `{"previousId": "...", "userId": "...", "timestamp": "..."}`).
 *
 * `userId` — "a string that will be the user's new identity, or an existing
 * identity you wish to merge" — is the only field the spec marks required.
 * `previousId` — "the existing ID you've referred to the user by" — is
 * documented optional, but an alias call carrying only `userId` merges
 * nothing; every real call site (Segment's own curl example, and the common
 * "merge an anonymous visitor into a signed-up user" use case) sends both.
 * This action mirrors the spec literally: `userId` required, `previousId`
 * strongly hinted but not force-required.
 *
 * `idempotent: true` — see `identify.ts` for the `messageId`/dedupe rationale.
 */
const action: ActionDefinition = {
  key: "alias",
  type: "perform",
  resource: "alias",
  title: "Alias",
  description: "Merge a previous identity (often an Anonymous ID) into a user's new identity.",
  idempotent: true,
  params: [
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "The user's new (or existing) identity to merge into.",
    },
    {
      key: "previousId",
      label: "Previous ID",
      type: "string",
      hint:
        "The existing ID (often an Anonymous ID) being merged. Required for the merge to do anything.",
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
    const userId = typeof p.userId === "string" ? p.userId.trim() : "";
    if (!userId) throw new Error("`userId` is required");
    const previousId = typeof p.previousId === "string" && p.previousId ? p.previousId : undefined;

    const body = compact({
      userId,
      previousId,
      ...buildCommon(p, ctx),
    });

    ctx.log("info", "Segment alias", { userId, previousId });
    return await post(ctx, "/alias", body);
  },
};

export default action;
