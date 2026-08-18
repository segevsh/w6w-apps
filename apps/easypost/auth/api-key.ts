import type { AuthDefinition } from "@w6w/types";
import { API_PATH, BASE_URL } from "../lib/client.ts";

/**
 * An EasyPost API key, sent as HTTP Basic with the key as the **username** and
 * an **empty password** — a trailing colon with nothing after it.
 *
 * ## Test keys and production keys look identical in every response
 *
 * This is the thing to be careful about. A test key creates shipments, returns
 * plausible rates and produces a label with a `label_url` you can open. **None
 * of it is real**: the label is not valid postage, no carrier has been told
 * anything, and nothing is charged.
 *
 * Nothing in a shipment's own response says which kind of key made it. So the
 * connection test reports the environment back explicitly, and every buying
 * action logs it — because "we shipped two hundred orders" and "we produced two
 * hundred worthless PNGs" are the same log line otherwise.
 *
 * EasyPost's dashboard issues both, and the key's own record carries a `mode`
 * of `test` or `production`, which is what this reads.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "An EasyPost API key, sent as the Basic-auth username with an empty password. A TEST key " +
    "returns rates and labels that look real and are not — nothing in a shipment says which.",
  connectionLabel: "EasyPost ({{mode}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "EasyPost Dashboard → API Keys. Test keys cost nothing and produce labels that are " +
        "not valid postage; production keys buy real postage and are charged.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The key is the username and the password is empty — hence the colon with
    // nothing after it, which is easy to omit entirely.
    request.headers["authorization"] = `Basic ${btoa(`${apiKey}:`)}`;
    return request;
  },

  /**
   * `GET /v2/users` — the authenticated user, which is the cheapest call that
   * proves the key works.
   *
   * It is also the only place the key's **mode** is stated, and reporting that
   * at connect time is the point: a test key wired into a production workflow
   * fails silently and expensively, by succeeding.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}${API_PATH}/users`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:`)}`,
          accept: "application/json",
        },
      });
    } catch (err) {
      return { ok: false, message: `could not reach EasyPost: ${String(err)}` };
    }

    if (res.status === 401 || res.status === 403) {
      const text = await res.text().catch(() => "");
      // EasyPost distinguishes a wrong key from a deactivated one, and the
      // fixes differ — one is a typo, the other is a dashboard visit.
      const deactivated = /inactive|deactivat/i.test(text);
      return {
        ok: false,
        message: deactivated
          ? "this API key exists but has been deactivated — reactivate it or issue a new one"
          : "EasyPost rejected this API key",
      };
    }
    if (!res.ok) {
      await res.body?.cancel();
      return { ok: false, message: `EasyPost returned ${res.status}` };
    }

    const body = await res.json().catch(() => null) as
      | { id?: string; name?: string; email?: string; api_keys?: Array<{ mode?: string }> }
      | null;
    const mode = modeOf(body?.api_keys, apiKey);
    return {
      ok: true,
      message: mode === "production"
        ? "connected with a PRODUCTION key — buying a label will purchase real postage and be " +
          "charged"
        : mode === "test"
        ? "connected with a TEST key — rates and labels will look real and buy nothing"
        : "connected, but EasyPost did not state whether this key is test or production",
    };
  },

  /** Records the mode. Never the key. */
  async afterConnect({ credential }, ctx) {
    const { apiKey } = credential as { apiKey: string };
    try {
      const res = await ctx.fetch(`${BASE_URL}${API_PATH}/users`, {
        headers: {
          authorization: `Basic ${btoa(`${apiKey}:`)}`,
          accept: "application/json",
        },
      });
      if (!res.ok) {
        await res.body?.cancel();
        return {};
      }
      const body = await res.json().catch(() => null) as
        | { name?: string; api_keys?: Array<{ mode?: string }> }
        | null;
      return { mode: modeOf(body?.api_keys, apiKey), account: body?.name };
    } catch {
      return {};
    }
  },
};

/**
 * Which environment a key belongs to.
 *
 * The user record lists the account's keys with their modes but not their
 * values, so matching by value is impossible — instead this reads the mode when
 * exactly one is present, and otherwise reports `unknown` rather than guessing.
 * Guessing here would be worse than not knowing.
 */
export function modeOf(
  keys: Array<{ mode?: string }> | undefined,
  _apiKey: string,
): string {
  const modes = new Set((keys ?? []).map((k) => String(k?.mode ?? "")).filter(Boolean));
  if (modes.size === 1) return [...modes][0];
  return "unknown";
}

export default apiKey;
