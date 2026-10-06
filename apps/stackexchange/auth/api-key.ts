import type { AuthDefinition } from "@w6w/types";
import { API_BASE, errorText, isApiError, type Wrapper } from "../lib/client.ts";

/**
 * Application key — sent as the `key` query parameter. Register an app at
 * https://stackapps.com/apps/oauth/register to get one. The key identifies the *application*, not
 * a user: it lifts the daily request quota from 300 per IP to 10,000 and is what the throttle
 * counts against. Reads need nothing else; writes (not modelled here) additionally need a
 * per-user OAuth `access_token`.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "Application Key",
  description:
    "Register an application at stackapps.com to get a key. Sent as the `key` query parameter; it raises the daily quota from 300 to 10,000 requests.",
  apiKey: { in: "query", name: "key" },
  fields: [
    {
      key: "apiKey",
      label: "Application key",
      type: "secret",
      required: true,
      hint: "The Key value (not the Client Secret) from your stackapps.com application.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const url = new URL(request.url);
    url.searchParams.set("key", apiKey);
    request.url = url.toString();
    return request;
  },

  /**
   * Probe: `GET /info?site=stackoverflow&key=…` — public network statistics, never the key. A good
   * key answers 200 with a wrapper whose `items[0].total_questions` is numeric. A key the API does
   * not know is HTTP 400 `{"error_name":"bad_parameter","error_message":"`key` doesn't match a
   * known application"}` (measured 2026-10-06); the verdict is read from that body, and a 400
   * about anything other than `key` is not called a bad credential.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(
        `${API_BASE}/info?site=stackoverflow&key=${encodeURIComponent(apiKey)}`,
        { headers: { accept: "application/json" } },
      );
    } catch (e) {
      return { ok: false, message: `could not reach the Stack Exchange API: ${e}` };
    }

    const raw = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch { /* non-JSON: the request probably never reached the API */ }

    if (res.ok && !isApiError(body)) {
      const first = (body as Wrapper | null)?.items?.[0] as
        | { total_questions?: unknown }
        | undefined;
      return typeof first?.total_questions === "number" ? { ok: true } : {
        ok: false,
        message: `unexpected ${res.status} body from GET /info — no site statistics in it`,
      };
    }
    if (!isApiError(body)) {
      return {
        ok: false,
        message:
          `Stack Exchange returned ${res.status} with a non-error body; the request may not have reached the API`,
      };
    }
    const text = errorText(body);
    if (/key/i.test((body as { error_message?: string }).error_message ?? "")) {
      return { ok: false, message: `${text} — check the Key value from stackapps.com` };
    }
    return { ok: false, message: text };
  },
};

export default apiKey;
