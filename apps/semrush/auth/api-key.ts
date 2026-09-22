import type { AuthDefinition } from "@w6w/types";
import { API_UNITS_PATH, LEGACY_BASE, parseApiUnits } from "../lib/client.ts";

/**
 * SEMrush API key — `Authorization: Apikey <key>`.
 *
 * Verified live on 2026-09-22: the current v4 Standard API reads the key from
 * an `Authorization` header whose scheme name is literally `Apikey` (not
 * `Bearer`, not `ApiKey`). Every one of the twelve `curl` examples on the v4
 * docs site uses it. This is **not** the old v3 convention, where the key went
 * in the query string; that form is still documented for the Standard API and
 * is deliberately not used here, for the same reason the pack's Apify app uses
 * a header and not `?token=`: a workflow host logs request URLs and does not
 * log headers.
 *
 * ## One hook, two hosts
 *
 * The app calls two hosts, and they want the key in two different places:
 *
 *  1. **`api.semrush.com`** — the `Authorization` header above. Every Standard
 *     API read.
 *  2. **`www.semrush.com`** — the legacy free API-unit balance endpoint, which
 *     documents the key as a `?key=` query parameter and no header form at all.
 *
 * Both are built here, in the one hook that ever sees the credential. The
 * choice is made by the request's own host, so an Action never has to know
 * which style it needs — which is what keeps the key out of Action code
 * entirely. See `lib/client.ts` for why this endpoint matters.
 *
 * ## The probe is free, and it is not the obvious endpoint
 *
 * `auth.test` cannot use a Standard-API report: every one of those costs the
 * customer real money in API units, so probing with one would bill the account
 * on every connection test and every health run. The balance endpoint costs
 * zero units and still requires a valid key, so it is the probe.
 *
 * ## The credential-echo trap this file is built around
 *
 * That endpoint's error body echoes the submitted key back:
 *
 *     {"errors":[{"field":"key","message":"invalid api key: <the exact key sent>"}]}
 *
 * Confirmed live for an invalid key. So `test` reads `errors[0].field` **only**
 * to classify the failure, and never returns the vendor's `message` — a static
 * "SEMrush rejected the API key." is returned instead. The same rule is applied
 * in `actions/api-units-balance-get.ts` and `lib/client.ts`, because the trap
 * exists on the wire, not in one call site. This is the same class of finding
 * as Mailjet's `/apikey` and Follow Up Boss's `/me`, except that here it is the
 * *error* path that leaks rather than a success body.
 */

export interface SemrushCredential {
  apiKey: string;
}

/** The header scheme name, exactly as SEMrush spells it. */
export const AUTH_SCHEME = "Apikey";

/**
 * The Standard-API header, built in one place so `test` and `sign` cannot drift
 * apart. Exported for tests; no Action may call it.
 */
export function authHeaders(credential: Partial<SemrushCredential>): Record<string, string> {
  return { authorization: `${AUTH_SCHEME} ${credential.apiKey ?? ""}` };
}

/** The balance endpoint with the key in the query, the one form it documents. */
export function balanceUrl(apiKey: string): string {
  const url = new URL(`${LEGACY_BASE}${API_UNITS_PATH}`);
  url.searchParams.set("key", apiKey);
  return url.toString();
}

/**
 * The `field` of the first entry in the legacy endpoint's error shape.
 *
 * Only the field name is ever read — the sibling `message` is the value that
 * carries the credential, and it is never touched.
 */
export function errorField(raw: string): string | undefined {
  try {
    const body = JSON.parse(raw) as { errors?: Array<{ field?: unknown }> };
    const field = body?.errors?.[0]?.field;
    return typeof field === "string" ? field : undefined;
  } catch {
    return undefined;
  }
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "A SEMrush API key. Buy API units on an SEO Business subscription, then generate the key " +
    "from the account UI under Subscription info > API Units. Self-serve, not a sales-gated " +
    "flow — the key is attached to the units you buy.",
  connectionLabel: "SEMrush",
  apiKey: { in: "header", name: "Authorization", prefix: `${AUTH_SCHEME} ` },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Subscription info > API Units in your SEMrush account. Calls are billed against the " +
        "units you buy, so give this connection its own key rather than sharing one with other " +
        "services.",
    },
  ],

  /**
   * The only hook that reads the key — and it runs network-less. Standard-API
   * requests get the `Authorization` header; a request bound for the legacy
   * balance host gets `?key=` appended to its URL instead.
   */
  sign({ request, credential }) {
    const key = (credential as Partial<SemrushCredential>)?.apiKey ?? "";
    const url = new URL(request.url);

    if (url.hostname === "www.semrush.com") {
      url.searchParams.set("key", key);
      request.url = url.toString();
      return request;
    }

    for (const [name, value] of Object.entries(authHeaders({ apiKey: key }))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * The credential-liveness probe: `GET www.semrush.com/users/countapiunits.html?key=…`.
   *
   * Free (zero API units) and credential-requiring, so it answers "is this key
   * live?" without charging the customer. Classification is from the **body**,
   * never the status alone: a `200` whose text parses as a unit count is a live
   * key, and a `400` naming the `key` field is a rejected one.
   *
   * The vendor's own error text is never returned: on this endpoint it contains
   * the key that was sent.
   */
  async test({ credential }, ctx) {
    const key = ((credential as Partial<SemrushCredential>)?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    let res: Response;
    try {
      res = await ctx.fetch(balanceUrl(key), { headers: { accept: "*/*" } });
    } catch {
      // A transport error's own message can quote the URL, which carries the key.
      return { ok: false, message: "SEMrush's API-units endpoint could not be reached" };
    }

    const raw = await res.text().catch(() => "");

    if (res.ok) {
      const balance = parseApiUnits(raw);
      if (balance === undefined) {
        return {
          ok: false,
          message:
            `SEMrush returned HTTP ${res.status} from the API-units endpoint but the body was ` +
            "not a unit count",
        };
      }
      return { ok: true, message: `${balance} API units remaining` };
    }

    // `errorField` reads only the field name. Its sibling `message` is exactly
    // where the submitted key comes back, so it is never read, let alone returned.
    if (errorField(raw) === "key") {
      return {
        ok: false,
        message: "SEMrush rejected the API key. Check it was copied exactly and still has units " +
          "bought against it (Subscription info > API Units).",
      };
    }
    return {
      ok: false,
      message: `SEMrush returned HTTP ${res.status} from the API-units endpoint`,
    };
  },
};

export default apiKey;
