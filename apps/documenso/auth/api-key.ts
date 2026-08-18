import type { AuthDefinition } from "@w6w/types";
import { API_PATH, CLOUD_BASE_URL, normalizeBaseUrl } from "../lib/client.ts";

/**
 * API key in the `Authorization` header, **with no scheme word**.
 *
 * Documenso's security scheme is `type: apiKey, in: header, name:
 * Authorization` — the key is the whole header value, not `Bearer <key>`.
 *
 * ## The 401 you will not get
 *
 * Measured 2026-08-18, calling the API with **no** `Authorization` header
 * answers **`400`**, not `401`, with a Zod validation tree complaining that a
 * header was `undefined`:
 *
 *   {"message":"Request validation failed","headerErrors":{"issues":[
 *     {"code":"invalid_type","expected":"string","received":"undefined"}]}}
 *
 * That is because the header is a declared *parameter* rather than a security
 * layer in front of the route — so a missing credential reads as a malformed
 * request. `test` says so rather than reporting a generic failure, because
 * "your key is wrong" and "your key never arrived" have different fixes.
 *
 * ## Self-hosted by default
 *
 * Documenso's whole appeal is that you can run it, and most deployments do. The
 * instance URL is therefore a field, defaulting to the cloud — which is also
 * why the app's egress allowlist is `["*"]`, the posture this pack uses for
 * `mattermost`, `ghost` and the other self-hostable apps.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A Documenso API key from Settings → API tokens, plus the instance it belongs to. Sent as " +
    "the whole `Authorization` header value — no `Bearer` prefix.",
  connectionLabel: "{{baseUrl}}",
  apiKey: { in: "header", name: "Authorization" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Documenso → Settings → API tokens.",
    },
    {
      key: "instanceUrl",
      label: "Instance URL",
      type: "string",
      default: "",
      placeholder: CLOUD_BASE_URL,
      hint: `Blank means the hosted service at ${CLOUD_BASE_URL}. Set it for a self-hosted ` +
        "Documenso.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    // The key IS the header value — no scheme word.
    request.headers["authorization"] = apiKey;
    return request;
  },

  /**
   * `GET /envelope?perPage=1` is the cheapest call that proves the key works
   * against the chosen instance — and, since envelopes are the current model,
   * it also proves the instance is new enough to have the Envelope API.
   */
  async test({ credential }, ctx) {
    const { apiKey, instanceUrl } = credential as { apiKey?: string; instanceUrl?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    let base: string;
    try {
      base = normalizeBaseUrl(instanceUrl ?? "");
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    const res = await ctx.fetch(`${base}${API_PATH}/envelope?perPage=1`, {
      headers: { authorization: apiKey, accept: "application/json" },
    });
    if (res.status === 400) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        message: body.includes("headerErrors")
          ? "Documenso saw no Authorization header (400) — the key did not reach the API"
          : `Documenso rejected the request (400): ${body.slice(0, 160)}`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: `Documenso rejected the API key (${res.status})` };
    }
    if (res.status === 404) {
      return {
        ok: false,
        message:
          `no Envelope API at ${base}${API_PATH} (404) — the URL may be wrong, or the instance ` +
          "may predate the Envelope API",
      };
    }
    if (!res.ok) return { ok: false, message: `Documenso returned ${res.status}` };
    return { ok: true };
  },

  /** Records which instance this connection talks to. Never the key. */
  afterConnect(_input) {
    const { credential } = _input as { credential: { instanceUrl?: string } };
    return { baseUrl: normalizeBaseUrl(credential.instanceUrl ?? "") };
  },
};

export default apiKey;
