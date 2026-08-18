import type { HookContext } from "@w6w/types";

/**
 * The Hugging Face Hub and the Inference router — probed live 2026-08-18.
 *
 * ## Three hosts, one token
 *
 * - **`huggingface.co/api`** — the Hub. Models, datasets, Spaces, files,
 *   repositories.
 * - **`router.huggingface.co`** — inference, and it is **OpenAI-compatible**:
 *   `POST /v1/chat/completions` with the same request and response shapes as
 *   the OpenAI API, dispatched to whichever provider serves that model.
 * - **`datasets-server.huggingface.co`** — dataset rows without downloading
 *   the dataset.
 *
 * The old `api-inference.huggingface.co` host no longer resolves — verified
 * live, it fails at the connection layer rather than returning an error. Code
 * written against it does not get a deprecation notice; it gets a DNS failure.
 *
 * ## Repository ids get renamed, and the old ones redirect
 *
 * `gpt2` is now `openai-community/gpt2`; `squad` is now `rajpurkar/squad`.
 * Verified live: the Hub answers **307** to the canonical id, and the datasets
 * server answers **404 with "The dataset has been renamed"**.
 *
 * Two different failures for the same cause, and the first is the dangerous
 * one: a client that does not follow redirects gets an empty body and no error.
 * `canonicalId` below is not something this app can compute — the mapping lives
 * on the Hub — so the client follows the redirect and reports where it landed,
 * which is the only way a caller notices the id they stored is historical.
 *
 * ## Rate limits use the RFC draft header, not `X-RateLimit-*`
 *
 * Measured on `huggingface.co/api`:
 *
 *     ratelimit: "api";r=494;t=170
 *     ratelimit-policy: "fixed window";"api";q=500;w=300
 *
 * That is the IETF structured-fields form: `r` is remaining, `t` is seconds to
 * reset, `q` is the quota and `w` the window. Nothing here is named
 * `X-RateLimit-Remaining`, so a client looking for the usual headers finds
 * none and concludes there are no limits.
 *
 * ## Gated repositories are readable and not downloadable
 *
 * A gated model's *metadata* comes back fine without a token — verified
 * against `meta-llama/Llama-3.1-8B`, HTTP 200. Its **files** do not, and the
 * gate is accepted in the web interface by a human agreeing to terms. A token
 * cannot accept it, so no amount of credential fixing makes a gated download
 * work; somebody has to click.
 */

export const HUB = "https://huggingface.co";
export const ROUTER = "https://router.huggingface.co";
export const DATASETS_SERVER = "https://datasets-server.huggingface.co";

/** What may be sent as a query-string value. */
export type QueryValue = string | number | boolean | undefined | null;

/** Coerce loosely-typed action params into query-string values, dropping empties. */
export function query(obj: Record<string, unknown>): Record<string, QueryValue> {
  const out: Record<string, QueryValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "number" || typeof v === "boolean" ? v : String(v);
  }
  return out;
}

/** Drop keys the caller left unset. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: unknown): string[] | undefined {
  if (Array.isArray(v)) {
    const items = v.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items : undefined;
  }
  if (typeof v !== "string" || !v.trim()) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/** Parse a JSON-typed param, which arrives as either a string or a live value. */
export function json(value: unknown, field: string): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`\`${field}\` is not valid JSON`);
  }
}

/**
 * Validate a repository id.
 *
 * `namespace/name`, or a bare name for the handful of legacy canonical repos
 * that have not been moved under an organisation. The bare form is accepted
 * because it still works — via a redirect — and refusing it would reject ids
 * that are all over the internet.
 */
export function repoId(value: unknown, field: string): string {
  const text = String(value ?? "").trim().replace(/^\/+|\/+$/g, "");
  if (!text) throw new Error(`\`${field}\` is required`);
  if (text.split("/").length > 2) {
    throw new Error(
      `\`${field}\` must be \`namespace/name\` — got ${JSON.stringify(text)}. A URL is not a ` +
        "repository id; take the two path segments after huggingface.co",
    );
  }
  return text;
}

/** The parsed form of the RFC draft `RateLimit` header. */
export interface RateLimit {
  remaining?: number;
  resetsIn?: number;
  quota?: number;
  window?: number;
}

/**
 * Parse `ratelimit: "api";r=494;t=170` and
 * `ratelimit-policy: "fixed window";"api";q=500;w=300`.
 *
 * The IETF structured-fields form, which nothing else in this pack uses — a
 * client looking for `X-RateLimit-Remaining` finds nothing here and concludes
 * the API has no limits.
 */
export function parseRateLimit(
  limitHeader: string | null,
  policyHeader: string | null,
): RateLimit {
  const out: RateLimit = {};
  const read = (header: string | null, key: string): number | undefined => {
    if (!header) return undefined;
    const match = new RegExp(`(?:^|;)\\s*${key}=(\\d+)`).exec(header);
    return match ? Number(match[1]) : undefined;
  };
  out.remaining = read(limitHeader, "r");
  out.resetsIn = read(limitHeader, "t");
  out.quota = read(policyHeader, "q");
  out.window = read(policyHeader, "w");
  return out;
}

/** Turn a Hugging Face error into something actionable. */
export function describeError(status: number, text: string): string {
  let detail = text.slice(0, 300);
  try {
    const body = JSON.parse(text) as { error?: string | { message?: string }; message?: string };
    const error = body?.error;
    detail = typeof error === "string" ? error : error?.message ?? body?.message ?? detail;
  } catch { /* not JSON */ }

  if (status === 401) {
    return `${detail} — the token was rejected. Note Hugging Face returns "Invalid username or ` +
      'password." for a bad token, which is the same message a wrong login gets and says nothing ' +
      "about tokens";
  }
  if (status === 403) {
    return `${detail} — the token is valid but not permitted here. Two common causes: a ` +
      "fine-grained token without this repository in its scope, or a GATED repository whose " +
      "terms have not been accepted — and a gate is accepted by a person in the web interface, " +
      "not by any token";
  }
  if (status === 404) {
    return `${detail} — not found. Repository ids get renamed (gpt2 became ` +
      "openai-community/gpt2, squad became rajpurkar/squad), and a private repository is " +
      "indistinguishable from a missing one without a token that can see it";
  }
  if (status === 429) {
    return `${detail} — rate limited. Hugging Face reports its limits in the RFC-draft ` +
      "`ratelimit` header rather than `X-RateLimit-*`, which is why nothing appeared to be " +
      "tracking them";
  }
  if (status === 503) {
    return `${detail} — the model is loading. Inference cold starts return 503 with an ` +
      "`estimated_time`, and the right response is to wait that long and retry rather than to " +
      "treat it as an outage";
  }
  return detail || `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** Defaults to the Hub. */
  host?: string;
  /** Several endpoints answer with something other than JSON. */
  text?: boolean;
}

/** A response, with where it landed and what the rate-limit headers said. */
export interface Result<T> {
  data: T;
  /** The final URL, which differs from the requested one after a rename. */
  url: string;
  redirected: boolean;
  rateLimit: RateLimit;
  /** The `Link` header verbatim — the Hub's next-page cursor lives in it. */
  link: string | null;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets the token — the runtime routes
 * every request through the auth `sign` hook.
 */
export class HuggingFaceClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return (await this.full<T>(path, options)).data;
  }

  /** The same, keeping the redirect and rate-limit information. */
  async full<T = unknown>(path: string, options: RequestOptions = {}): Promise<Result<T>> {
    const host = options.host ?? HUB;
    const url = new URL(`${host}${path}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {
      accept: options.text ? "*/*" : "application/json",
    };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(url.toString(), init);
    const text = await res.text().catch(() => "");
    const rateLimit = parseRateLimit(
      res.headers.get("ratelimit"),
      res.headers.get("ratelimit-policy"),
    );
    const link = res.headers.get("link");

    if (!res.ok) {
      throw new Error(
        `Hugging Face ${res.status} for ${init.method} ${url.pathname}: ${
          describeError(res.status, text)
        }`,
      );
    }

    // A renamed repository lands somewhere else, and the caller's stored id is
    // historical — which nothing else would tell them.
    const finalUrl = res.url || url.toString();
    const redirected = Boolean(res.url) && new URL(res.url).pathname !== url.pathname;

    if (res.status === 204 || !text) {
      return { data: undefined as T, url: finalUrl, redirected, rateLimit, link };
    }
    if (options.text) return { data: text as T, url: finalUrl, redirected, rateLimit, link };
    try {
      return { data: JSON.parse(text) as T, url: finalUrl, redirected, rateLimit, link };
    } catch {
      throw new Error(`Hugging Face did not return JSON: ${text.slice(0, 160)}`);
    }
  }
}

/**
 * Whether a repository's `gated` field means downloads are blocked.
 *
 * `false` is open. `"auto"` grants access as soon as somebody agrees to the
 * terms; `"manual"` needs the author to approve each request. Both are gates,
 * and both are accepted by a person rather than by a credential.
 */
export function isGated(gated: unknown): boolean {
  return gated === "auto" || gated === "manual" || gated === true;
}
