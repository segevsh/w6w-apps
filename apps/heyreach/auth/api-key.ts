import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, truncate } from "../lib/client.ts";

/**
 * HeyReach API key — a single `X-API-KEY` header.
 *
 * ## The header, and nothing else
 *
 * HeyReach's OpenAPI document declares no `securityScheme` at all; every one of
 * its 87 operations lists `X-API-KEY` as an ordinary header parameter,
 * described as `API key header using this scheme. Example: "X-API-KEY:
 * {API_KEY}"`. There is no bearer prefix, no HMAC, no OAuth. `sign` stamps the
 * header and returns — the key never reaches a URL, so it cannot leak into a
 * log line or a proxy record.
 *
 * ## 401 is not one answer, it is two — and the status code cannot tell them apart
 *
 * Verified live on 2026-09-22 against `GET https://api.heyreach.io/api/public/auth/CheckApiKey`:
 *
 *   | request                    | status | body                        | content-type |
 *   | -------------------------- | ------ | --------------------------- | ------------ |
 *   | no `X-API-KEY` at all      | 401    | `Missing API key`           | none         |
 *   | `X-API-KEY: bogus-…`       | 401    | `Invalid API key`           | none         |
 *
 * Both are HTTP 401, both are **plain text** — the document's
 * `UnauthorizedErrorBody` JSON schema (`type`, `title`, `status`, `detail`, …)
 * is fiction; no `content-type` header is even sent. So the *body text* is the
 * only discriminator, and {@link classifyAuthAnswer} is the one place that
 * decodes it. `Missing API key` means the credential never reached the request
 * (a wiring problem — reconnect); `Invalid API key` means the vendor read a key
 * and refused it (paste it again, or regenerate it).
 *
 * ## The probe returns nothing, which is the point
 *
 * `GET /api/public/auth/CheckApiKey` is documented as `200 Successful
 * response` with **no response body**, and two live probes confirm the vendor
 * answers it with a bare status. There is consequently nothing in the answer
 * that could echo the caller's key back — the one thing this app must never
 * store. (Contrast a whoami that returns a key-shaped field.) The body is
 * therefore not parsed at all: a 200 *is* the answer.
 */

export interface HeyReachCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built — `sign` and `test` both use it, so a
 * probe can never send a header real requests do not.
 */
export function authHeaders(credential: Partial<HeyReachCredential>): Record<string, string> {
  return { "X-API-KEY": credential.apiKey ?? "" };
}

/** The credential-liveness probe. Requires no scope and returns no body. */
export const PROBE_PATH = "/auth/CheckApiKey";

/** What the vendor's answer actually means. */
export type AuthAnswer =
  /** `200` — the key was accepted. */
  | "accepted"
  /** `401 Invalid API key` — a key was read and refused. */
  | "key-rejected"
  /** `401 Missing API key` — no key reached the request. */
  | "key-missing"
  /** `429` — the key is fine; the account is being throttled. */
  | "rate-limited"
  /** Anything else: an unexpected body, a proxy, an outage, an SPA shell. */
  | "unexpected";

/**
 * Decode HeyReach's auth answer from the response **body**, never the status
 * alone — the two 401s above are indistinguishable by status code.
 *
 * Shared with `health/api.ts` so the credential probe and the reachability
 * probe can never disagree about what the same wire response means.
 */
export function classifyAuthAnswer(status: number, text: string): AuthAnswer {
  const body = text.trim();
  if (status === 200) return "accepted";
  if (status === 401) {
    if (/invalid/i.test(body) && /api[\s-]*key/i.test(body)) return "key-rejected";
    if (/missing/i.test(body) && /api[\s-]*key/i.test(body)) return "key-missing";
    return "unexpected";
  }
  if (status === 429) return "rate-limited";
  return "unexpected";
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste a HeyReach API key (HeyReach > Settings > API). HeyReach sends it as a single " +
    "`X-API-KEY` header on every request.",
  connectionLabel: "HeyReach",
  apiKey: { in: "header", name: "X-API-KEY" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "HeyReach > Settings > API. The key is a long-lived workspace credential that can " +
        "send messages and change campaigns, so give this connection its own key rather than a " +
        "shared one, and rotate it if it is ever pasted somewhere else.",
    },
  ],

  /**
   * The only hook handed the raw credential. Runs network-less: it stamps the
   * header and returns. The key never appears in a URL or a body.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<HeyReachCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See the module docs: the answer is read from the body, never the status. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<HeyReachCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
        headers: { accept: "application/json", ...authHeaders({ apiKey: key }) },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${API_BASE}: ${String(err)}` };
    }

    const text = await res.text().catch(() => "");
    const answer = classifyAuthAnswer(res.status, text);

    switch (answer) {
      case "accepted":
        return { ok: true, message: "connected — HeyReach accepted the API key" };
      case "key-rejected":
        return {
          ok: false,
          message:
            `HeyReach answered ${res.status} "${truncate(text, 80)}" — the vendor is reachable ` +
            "and this key is not accepted. Check it was copied whole and has not been " +
            "regenerated in HeyReach under Settings > API.",
        };
      case "key-missing":
        return {
          ok: false,
          message: `HeyReach answered ${res.status} "${truncate(text, 80)}" — no key reached the ` +
            "request at all. This connection's credential was not attached; reconnect it.",
        };
      case "rate-limited":
        return {
          ok: false,
          message:
            "HeyReach answered 429 — the key is valid but the workspace is being throttled. " +
            "Retry later rather than reconnecting.",
        };
      default:
        return {
          ok: false,
          message: `HTTP ${res.status} from GET ${PROBE_PATH}` +
            `${text.trim() ? `: ${truncate(text.trim())}` : " with no body"} — that is not the ` +
            "auth answer HeyReach's own API gives (200, or a 401 reading `Missing API key` / " +
            "`Invalid API key`), so something other than the API answered.",
        };
    }
  },
};

export default apiKey;
