import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * API Key (`apiKey`, body-located).
 *
 * UptimeRobot's v2 API is POST-only and takes the API key as a
 * **form-urlencoded body field**, `api_key`, on every request — never as an
 * `Authorization` header and never (with one documented exception,
 * `getMonitors`, which this app does not rely on) as a query parameter.
 * Verified directly against UptimeRobot's own published docs
 * (`uptimerobot.com/api/legacy/`, fetched 2026-08-01): "While making a
 * request, you must send the api_key in your request's body," and every
 * single example on that page POSTs `Content-Type:
 * application/x-www-form-urlencoded` with a body of
 * `api_key=...&format=json&...`. n8n's own `UptimeRobotApi.credentials.ts`
 * encodes the identical shape (`authenticate.properties.body.api_key`).
 *
 * `apiKey: { in: "body", name: "api_key" }` records that location
 * declaratively for `describe()`/UI purposes — `ApiKeyConfig.in` supports
 * `"body"` alongside `"header"`/`"query"` (see `@w6w/types` `auth.ts`). But
 * exactly as every other Auth method in this pack, the *type* field is
 * metadata only: the runtime never auto-signs from it, so `sign` below does
 * the actual work by hand.
 *
 * ## Why this needs special handling
 *
 * Every other Auth method in this pack injects the credential into a
 * *header* — a location `SignableRequest.headers` models directly. A
 * form-body key has nowhere else to go: it has to be merged into
 * `SignableRequest.body`, which is a plain `string | null` (the wire bytes,
 * not a parsed structure — see `hooks.ts`). So `sign` here:
 *
 * 1. Parses the action's already-built body (an `application/
 *    x-www-form-urlencoded` string, e.g. `friendly_name=Foo&type=1`) with
 *    `URLSearchParams` — the empty string when an action sends no fields of
 *    its own (e.g. `account-get`).
 * 2. Sets `api_key` (and `format=json`, so no action needs to remember it)
 *    on top of whatever the action already put there — actions never set
 *    either field themselves.
 * 3. Re-serializes and writes the result back onto `request.body`, and
 *    stamps the content-type header for good measure (the action already
 *    sets it too; this just makes `sign` correct standalone).
 *
 * This is the only Auth method in this pack that touches `request.body`
 * rather than `request.headers` — most apps only ever need the header case.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "Paste your account-specific API key from My Settings on uptimerobot.com.",
  apiKey: { in: "body", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "uptimerobot.com → My Settings → API Settings → Main API Key (account-specific).",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    const params = new URLSearchParams(request.body ?? undefined);
    params.set("api_key", apiKey);
    if (!params.has("format")) params.set("format", "json");
    request.body = params.toString();
    request.headers["content-type"] = "application/x-www-form-urlencoded";
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) {
      return { ok: false, message: "credential missing apiKey" };
    }
    const res = await ctx.fetch(`${API_URL}/getAccountDetails`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: apiKey, format: "json" }).toString(),
    });
    if (!res.ok) return { ok: false, message: `UptimeRobot returned HTTP ${res.status}` };
    const body = await res.json() as { stat?: string; error?: { message?: string } };
    if (body.stat !== "ok") {
      return { ok: false, message: body.error?.message ?? "UptimeRobot rejected the API key" };
    }
    return { ok: true };
  },
};

export default apiKey;
