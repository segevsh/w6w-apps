import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, errorId, errorText } from "../lib/client.ts";

/**
 * Slite personal API key.
 *
 * Generated in Slite under organization menu > Settings > API > "Create a new key"; it is shown
 * once. Slite's own words: "This API key authorize access to all the user content" — it acts as
 * the user who created it, so what a workflow can read is bounded by what that user can see.
 *
 * ## Two documented header shapes — both are sent
 *
 * Slite's docs disagree with themselves. The prose guide ("Authentication - Get your API
 * key") says to pass the key as an `x-slite-api-key` header and shows a curl with it. Every
 * operation's OpenAPI document instead declares `securitySchemes.bearer` (`type: http`,
 * `scheme: bearer`, "API keys can be generated under Settings > API"). A real key was not
 * available to settle which one the gateway reads, and an unauthenticated probe cannot: a
 * missing key, an `x-slite-api-key: bogus` and an `Authorization: Bearer bogus` all answer the
 * byte-identical `401 {"id":"auth/unauthorized","message":"Invalid apiKey"}` (measured
 * 2026-10-06). So {@link authHeaders} stamps BOTH, with the same value. Each is vendor
 * documented; neither is guessed.
 *
 * ## The probe is `GET /v1/me`
 *
 * Chosen by the response body. `Me` is `{email, organizationDomain, organizationName,
 * displayName}` — the caller's own profile and workspace names, nothing that echoes the key. It
 * needs no scope beyond `read`, no parameters, and no particular channel permission, unlike a
 * notes read.
 *
 * Verdicts come from the body, with the status as a hint: a `200` passes only when the body is
 * an object with a string `email`; a `401` is read from `id: "auth/unauthorized"`.
 */

export interface SliteCredential {
  apiKey: string;
}

export const PROBE_PATH = "/me";

/** The one place the wire format is built, shared by `sign` and `test`. */
export function authHeaders(credential: Partial<SliteCredential>): Record<string, string> {
  const key = credential.apiKey ?? "";
  return { "x-slite-api-key": key, authorization: `Bearer ${key}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a personal API key from Slite: organization menu > Settings > API > Create a new key. " +
    "The key is shown once and acts as the user who created it.",
  connectionLabel: "Slite",
  apiKey: { in: "header", name: "x-slite-api-key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Slite > organization menu > Settings > API > Create a new key. It is displayed " +
        "only once, so copy it immediately.",
    },
  ],

  /** The only hook handed the raw credential; network-less — stamps the headers and returns. */
  sign({ request, credential }) {
    for (
      const [name, value] of Object.entries(authHeaders(credential as Partial<SliteCredential>))
    ) {
      request.headers[name] = value;
    }
    return request;
  },

  async test({ credential }, ctx) {
    const key = ((credential as Partial<SliteCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    // `sign` only auto-applies to action traffic, so the headers are built by hand here.
    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
    });
    const body = await res.json().catch(() => null) as Record<string, unknown> | null;

    if (res.ok) {
      if (body && typeof body.email === "string") return { ok: true };
      return {
        ok: false,
        message: `Slite answered HTTP ${res.status} for ${PROBE_PATH} without a profile body`,
      };
    }
    const id = errorId(body);
    const message = errorText(body);
    if (id === "auth/unauthorized" || res.status === 401) {
      return {
        ok: false,
        message: `Slite rejected the API key (${res.status}${message ? ` ${message}` : ""}). ` +
          "Check it was copied exactly and has not been revoked in Settings > API.",
      };
    }
    if (id === "rate-limit" || res.status === 429) {
      return { ok: false, message: "Slite rate-limited the credential check — retry shortly." };
    }
    return {
      ok: false,
      message: `Slite returned HTTP ${res.status}${id ? ` (${id})` : ""} for ${PROBE_PATH}`,
    };
  },
};

export default apiKey;
