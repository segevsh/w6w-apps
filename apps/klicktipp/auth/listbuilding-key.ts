import type { AuthDefinition } from "@w6w/types";
import { BASE_URL, ERROR_CODES, errorObject, parseJson } from "../lib/client.ts";

/**
 * Listbuilding API key — the credential for the three `listbuilding-*`
 * actions (`/subscriber/signin`, `/signoff`, `/signout`), and nothing else.
 *
 * The vendor's key is created under Listbuilding → New Listbuilding → Entry via
 * API key, and is permanently bound to one opt-in process and one tag. It travels
 * as an `apikey` field in the JSON request body, never a header. `sign` merges
 * it into whatever body the action built.
 *
 * Management actions (`subscriber-*`, `tag-*`, ...) need the `session`
 * connection instead; run under this one they answer 403 "API access denied".
 */
const listbuildingKey: AuthDefinition = {
  key: "listbuilding-key",
  type: "apiKey",
  displayName: "Listbuilding API Key",
  description: "A Listbuilding API key (Listbuilding → New Listbuilding → Entry via API key). " +
    "Bound to one opt-in process and one tag; only the Listbuilding actions can use it.",
  connectionLabel: "KlickTipp Listbuilding",
  apiKey: { in: "body", name: "apikey" },
  fields: [
    {
      key: "apiKey",
      label: "Listbuilding API Key",
      type: "secret",
      required: true,
      hint: "Listbuilding → New Listbuilding → Entry via API key.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    let body: Record<string, unknown> = {};
    if (typeof request.body === "string" && request.body.trim()) {
      const parsed = parseJson(request.body);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    }
    body.apikey = apiKey;
    request.body = JSON.stringify(body);
    request.headers["content-type"] = "application/json";
    return request;
  },

  /**
   * The Listbuilding API has no read-only endpoint, so the probe is a `signin`
   * with the key and NO email or SMS number — a request that cannot create a
   * contact whatever the key. Measured 2026-10-06 with a bogus key: the key is
   * checked before the fields (`{"error":100}` even with no email). So error
   * 100 means the key is wrong, and a documented missing/invalid-contact error
   * (32, or 5/7) means the key got past the check. The valid-key branch is
   * inferred from the vendor's error table, not observed — no live key was
   * available.
   */
  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };
    let res: Response;
    try {
      res = await ctx.fetch(`${BASE_URL}/subscriber/signin`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ apikey: apiKey }),
      });
    } catch (err) {
      return { ok: false, message: `KlickTipp unreachable: ${String(err)}` };
    }
    const err = errorObject(parseJson(await res.text()));
    const code = err ? Number(err.error) : undefined;
    if (code === 100) {
      return { ok: false, message: `KlickTipp rejected the key: ${ERROR_CODES[100]}` };
    }
    if (code === 32 || code === 5 || code === 7) return { ok: true };
    return {
      ok: false,
      message: `could not confirm the key: KlickTipp answered HTTP ${res.status}` +
        (code !== undefined ? ` with error ${code}` : ""),
    };
  },
};

export default listbuildingKey;
