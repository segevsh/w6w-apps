import type { AuthDefinition } from "@w6w/types";
import { baseUrlFor, formatDocuSealError, HOSTS, regionOf } from "../lib/client.ts";

/**
 * API key (`apiKey`), sent as `X-Auth-Token` — DocuSeal's only documented
 * auth mechanism. Confirmed against the spec's `securitySchemes`:
 *
 *     AuthToken: { type: apiKey, in: header, name: X-Auth-Token }
 *
 * ## One method, a region field — not one method per region
 *
 * DocuSeal fixes an account to one of two hosts (see `lib/client.ts`), but
 * unlike an OAuth2 redirect the credential exchange here has no host baked
 * into it — an api key is typed in, not obtained via a browser round-trip to
 * a specific domain. So a single Auth method with a `region` field, resolved
 * at connect time and recorded on the Connection, is enough; this is the same
 * shape `duda` and `amplitude` use for their own US/EU splits, not the
 * per-region `AuthDefinition` split `zohobooks` is forced into by its OAuth2
 * flow.
 *
 * ## The auth probe, and why it never echoes the key
 *
 * `GET /templates?limit=1` is the cheapest documented call every issued key
 * can reach. The response never contains the credential — the endpoint
 * returns templates, not the token that fetched them — so the message below
 * is safe to surface verbatim either way.
 *
 * ## No 401/400 split — DocuSeal doesn't offer one
 *
 * Measured live 2026-09-29 against both hosts, a request with **no**
 * `X-Auth-Token` header and a request with a syntactically-plausible but
 * invalid one both answer identically:
 *
 *     401 {"error":"Not authenticated"}
 *
 * There is no vendor code to distinguish "missing" from "wrong" the way this
 * pack's `zohobooks` can (`code: 14` vs `code: 57`) — DocuSeal's body carries
 * only the one generic string, read here rather than assumed from the status
 * alone.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description: "A DocuSeal API key from Settings → API, plus the region your account lives in. " +
    "Sent as the X-Auth-Token header.",
  connectionLabel: "DocuSeal ({{region}})",
  apiKey: { in: "header", name: "X-Auth-Token" },
  fields: [
    {
      key: "region",
      label: "Region",
      type: "select",
      required: true,
      default: "global",
      options: [
        { value: "global", label: `Global — ${HOSTS.global}` },
        { value: "eu", label: `EU — ${HOSTS.eu}` },
      ],
      hint: "DocuSeal accounts live on exactly one of these two hosts — check Settings → API for " +
        "which one issued your key.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → API in your DocuSeal account.",
    },
  ],

  /** The only hook that sees the credential. */
  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["x-auth-token"] = apiKey;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as { apiKey?: string; region?: string };
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const base = baseUrlFor(regionOf(cred.region));
    const res = await ctx.fetch(`${base}/templates?limit=1`, {
      headers: { accept: "application/json", "x-auth-token": key },
    });
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    return { ok: false, message: formatDocuSealError(res.status, "GET", "/templates", text) };
  },

  /** Records which host this connection talks to. Never the key. */
  afterConnect({ credential }) {
    const { region } = credential as { region?: string };
    return { region: regionOf(region) };
  },
};

export default apiKey;
