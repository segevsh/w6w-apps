import type { ActionDefinition } from "@w6w/types";
import { OnePasswordClient } from "../lib/client.ts";
import {
  CURSOR_PARAM,
  END_TIME_PARAM,
  eventsBody,
  LIMIT_PARAM,
  START_TIME_PARAM,
} from "../lib/events.ts";

/**
 * `POST /api/v1/signinattempts` — every attempt to sign in, successful or not.
 *
 * ## The failures are the point
 *
 * A successful sign-in is a line in a log. A **run** of failures from one
 * account, or one country, or one IP, is the thing worth alerting on — and
 * `category` says which kind of failure it was:
 *
 * - `credentials_failed` — wrong password. Ordinary in ones, interesting in
 *   dozens.
 * - `mfa_failed` — the password was right and the second factor was not. This
 *   is the serious one: it means somebody has a working password.
 * - `firewall_failed` / `firewall_reported_success` — blocked by, or noticed
 *   by, the account's own IP rules.
 * - `modern_version_failed` — an outdated client, which is noise.
 *
 * A workflow watching this should treat `mfa_failed` differently from
 * `credentials_failed`, so this action counts them separately rather than
 * leaving a caller to know the vocabulary.
 *
 * ## `type` is `credentials_ok` on success
 *
 * Success and failure share the stream, and the discriminator is `category`
 * being `success` rather than any field named for it.
 */
const action: ActionDefinition = {
  key: "signin-attempt-list",
  type: "read",
  resource: "event",
  title: "List sign-in attempts",
  description:
    "Every sign-in attempt, successful or not. `mfa_failed` is the one that matters — it means " +
    "somebody had a working password — and it is counted separately here.",
  params: [START_TIME_PARAM, END_TIME_PARAM, LIMIT_PARAM, CURSOR_PARAM],
  output: [
    { key: "attempts", type: "array", label: "Sign-in attempts" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
    { key: "hasMore", type: "boolean", label: "Whether to keep going" },
    { key: "failed", type: "number", label: "Attempts that did not succeed" },
    { key: "mfaFailed", type: "number", label: "Password right, second factor wrong" },
    { key: "categories", type: "object", label: "A count per failure category" },
  ],

  async execute(input, ctx) {
    const client = new OnePasswordClient(ctx);
    const host = client.requireEvents("signin-attempt-list");
    const p = input as Record<string, unknown>;

    const result = await client.request<{
      items?: Array<{ category?: string; type?: string }>;
      cursor?: string;
      has_more?: boolean;
    }>(host, "/api/v1/signinattempts", {
      method: "POST",
      body: eventsBody(
        String(p.cursor ?? "").trim(),
        Number(p.limit ?? 100),
        String(p.startTime ?? "").trim(),
        String(p.endTime ?? "").trim(),
      ),
    });

    const attempts = result?.items ?? [];
    const categories: Record<string, number> = {};
    for (const attempt of attempts) {
      const category = String(attempt?.category ?? "unknown");
      categories[category] = (categories[category] ?? 0) + 1;
    }

    // Counts only — an attempt carries an email address and an IP.
    const failed = attempts.filter((attempt) => attempt?.category !== "success").length;
    const mfaFailed = categories["mfa_failed"] ?? 0;

    ctx.log("info", "read 1Password sign-in attempts", {
      count: attempts.length,
      failed,
      mfaFailed,
    });

    return {
      attempts,
      count: attempts.length,
      cursor: result?.cursor,
      hasMore: result?.has_more === true,
      failed,
      // The one that means somebody had a working password.
      mfaFailed,
      categories,
    };
  },
};

export default action;
