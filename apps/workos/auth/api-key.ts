import type { AuthDefinition } from "@w6w/types";
import { BASE_URL } from "../lib/client.ts";

/**
 * WorkOS API key, sent as `Authorization: Bearer`.
 *
 * ## The prefix is the environment
 *
 * A WorkOS key starts with `sk_test_` or `sk_live_`, and the two see entirely
 * different data — the same organization does not exist in both. There is no
 * environment field here because the key already says which one it is, and
 * `test` reports it back so a connection labelled "production" that is actually
 * staging is visible at a glance rather than after a workflow writes to the
 * wrong place.
 *
 * ## What the key can do is not narrowable
 *
 * WorkOS keys are not scoped: one key can read every organization, mint Admin
 * Portal links and create users. There is no read-only variant, which is worth
 * knowing when deciding where this connection lives — the credential is as
 * powerful as the dashboard.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A WorkOS API key. Its `sk_test_` or `sk_live_` prefix decides which environment's data it " +
    "sees — they share nothing. WorkOS keys are not scopeable.",
  connectionLabel: "WorkOS ({{environment}})",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "WorkOS Dashboard → API Keys. `sk_test_…` for staging, `sk_live_…` for production.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * `GET /organizations?limit=1` — the cheapest call that proves the key works.
   * It also reports how many organizations the environment has, which is the
   * quickest way to notice a staging key pointed at a production workflow: an
   * empty staging environment looks exactly like a broken connection otherwise.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${BASE_URL}/organizations?limit=1`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" },
    });
    if (res.status === 401) {
      await res.body?.cancel();
      return { ok: false, message: "WorkOS rejected this API key" };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `WorkOS returned ${res.status}` };
    }
    const body = await res.json().catch(() => null) as { data?: unknown[] } | null;
    const environment = environmentOf(apiKey);
    const count = Array.isArray(body?.data) ? body.data.length : 0;
    return {
      ok: true,
      message: count === 0
        ? `connected to the ${environment} environment, which has no organizations yet`
        : `connected to the ${environment} environment`,
    };
  },

  /** Records which environment the key belongs to. Never the key. */
  afterConnect({ credential }) {
    const { apiKey } = credential as { apiKey: string };
    return { environment: environmentOf(apiKey) };
  },
};

/** `sk_live_…` is production, `sk_test_…` is staging; anything else is unknown. */
export function environmentOf(apiKey: string): string {
  if (apiKey.startsWith("sk_live_")) return "production";
  if (apiKey.startsWith("sk_test_")) return "staging";
  return "unknown";
}

export default apiKey;
