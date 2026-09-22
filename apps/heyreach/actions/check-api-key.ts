import type { ActionDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, truncate } from "../lib/client.ts";
import { classifyAuthAnswer, PROBE_PATH } from "../auth/api-key.ts";

interface Output {
  status: number;
  connected: boolean;
  message: string;
}

/**
 * `GET /api/public/auth/CheckApiKey` — "Check If your API key is working."
 *
 * The one HeyReach operation that needs nothing but a key, which makes it the
 * natural guard step: run it first and fail fast, instead of discovering the
 * connection is dead three actions into a campaign.
 *
 * ## It answers; it does not throw (for the two documented auth answers)
 *
 * HeyReach's own two answers to this call are *both* HTTP 401 (verified live
 * 2026-09-22): `Missing API key` when no key reached the request, and
 * `Invalid API key` when one did and was refused. Neither is an error of this
 * action — they are the answer to the question it asks — so both come back as
 * `{ status, connected: false, message }` and a workflow branches on
 * `connected`. Everything else *is* an error and is thrown: a 5xx, a 429, or an
 * HTML body is not an answer about the key, it is a broken call.
 *
 * The classification itself lives in `../auth/api-key.ts`'s
 * {@link classifyAuthAnswer}, shared with `health/api.ts`, so the action and
 * the health check can never disagree about what one response means.
 *
 * ## Why this is not also the health check
 *
 * It is the same wire call, but the two consumers want different things: this
 * Action reports a workflow-visible verdict (`connected`) the moment it runs,
 * while `health/api.ts` reports a host-visible health *state* and is the check
 * that says "HeyReach is reachable, the credential is the problem". Both read
 * the response through the same helper; neither invents its own reading.
 */
const action: ActionDefinition<Record<string, never>, Output> = {
  key: "check-api-key",
  type: "read",
  resource: "auth",
  title: "Check API Key",
  description:
    "Verify the connection's HeyReach API key (GET /api/public/auth/CheckApiKey). Returns " +
    "`connected: false` when HeyReach rejects the key, and throws when the API itself fails.",
  params: [],
  sample: { status: 200, connected: true, message: "connected — HeyReach accepted the API key" },
  output: [
    { key: "status", type: "number", label: "HTTP status HeyReach answered" },
    { key: "connected", type: "boolean", label: "Key accepted (true) or refused (false)" },
    { key: "message", type: "string", label: "What HeyReach answered" },
  ],

  async execute(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    const text = await res.text().catch(() => "");
    const answer = classifyAuthAnswer(res.status, text);

    switch (answer) {
      case "accepted":
        return { status: res.status, connected: true, message: "HeyReach accepted the API key." };
      case "key-rejected":
      case "key-missing":
        return {
          status: res.status,
          connected: false,
          message: `HeyReach answered ${res.status} "${truncate(text.trim(), 80)}".`,
        };
      case "rate-limited":
        throw new Error(
          "HeyReach answered 429 to its own auth endpoint — the connection is throttled rather " +
            "than broken. Retry later.",
        );
      default:
        throw new Error(
          `HeyReach answered ${res.status} to ${PROBE_PATH}` +
            `${text.trim() ? `: ${truncate(text.trim())}` : " with no body"} — that is neither ` +
            "its 200 nor a 401 carrying `Missing API key`/`Invalid API key`, so this is not an " +
            "answer about the key.",
        );
    }
  },
};

export default action;
