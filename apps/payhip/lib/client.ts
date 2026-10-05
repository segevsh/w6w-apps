import type { HookContext } from "@w6w/types";

/**
 * Payhip license-key API client.
 *
 * Payhip's public API is the software license-key API and nothing else (read from
 * `help.payhip.com/article/317-public-api` for v2 and `/114-public-api` for the legacy v1,
 * 2026-10-05; not exercised against a live account). Both live on one host:
 *
 *  - **v2 (current)** `https://payhip.com/api/v2/license/...`, authenticated by a per-product
 *    `product-secret-key` header; no `product_link` parameter (the secret identifies the product).
 *  - **v1 (legacy)** `https://payhip.com/api/v1/license/...`, authenticated by an account-wide
 *    `payhip-api-key` header, with a required `product_link` parameter. Payhip still documents it,
 *    flagged as legacy.
 *
 * Verify is `GET` with a query string; enable/disable/usage/decrease are `PUT` with a
 * form-encoded body (the reference examples use `curl -d`). Every success is `{"data": {...}}`.
 * **A failure is an empty response**, not an error body, so "unknown key", "wrong secret" and
 * "disabled" cannot be told apart from the wire.
 */
export const API_BASE = "https://payhip.com";

export type ApiVersion = "v2" | "v1";

/** The documented license record. */
export interface License {
  enabled: boolean;
  product_link: string;
  license_key: string;
  buyer_email: string;
  uses: number;
  date: string;
}

export interface CallOptions {
  version?: ApiVersion;
  licenseKey: string;
  /** Required for v1, ignored for v2. */
  productLink?: string;
}

export function licenseUrl(op: string, version: ApiVersion): string {
  return `${API_BASE}/api/${version}/license/${op}`;
}

/** The form/query fields for one call; v1 adds `product_link`. */
export function licenseFields(opts: CallOptions): URLSearchParams {
  const version = opts.version ?? "v2";
  const licenseKey = (opts.licenseKey ?? "").trim();
  if (!licenseKey) throw new Error("Payhip: licenseKey is required");
  const fields = new URLSearchParams();
  if (version === "v1") {
    const productLink = (opts.productLink ?? "").trim();
    if (!productLink) throw new Error("Payhip: productLink is required for the legacy v1 API");
    fields.set("product_link", productLink);
  }
  fields.set("license_key", licenseKey);
  return fields;
}

export class PayhipClient {
  constructor(private readonly ctx: HookContext) {}

  /**
   * Call one license endpoint. Resolves the license record, or `null` for Payhip's empty
   * "it failed" response. Throws on a 5xx, on a body that is not the documented
   * `{data: {...}}` shape, and (via the caller) never on a bare empty answer.
   */
  async call(op: string, method: "GET" | "PUT", opts: CallOptions): Promise<License | null> {
    const version = opts.version ?? "v2";
    const fields = licenseFields(opts);
    const url = licenseUrl(op, version);
    const res = method === "GET"
      ? await this.ctx.fetch(`${url}?${fields}`, {
        method,
        headers: { accept: "application/json" },
      })
      : await this.ctx.fetch(url, {
        method,
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: fields.toString(),
      });

    const text = (await res.text()).trim();
    if (res.status >= 500) throw new Error(`Payhip returned HTTP ${res.status} for license/${op}`);
    if (!text) return null;

    let body: { data?: License; error?: unknown; message?: unknown } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    if (!body || typeof body !== "object") {
      throw new Error(
        `Payhip returned a non-JSON body (HTTP ${res.status}) for license/${op}; ` +
          'expected {"data": {...}}',
      );
    }
    if (!body.data || typeof body.data !== "object") {
      const msg = typeof body.message === "string"
        ? body.message
        : typeof body.error === "string"
        ? body.error
        : "no data field";
      throw new Error(`Payhip rejected license/${op} (HTTP ${res.status}): ${msg}`);
    }
    return body.data;
  }
}

/** Shape the outputs every license action shares. */
export function licenseOutput(license: License | null) {
  return {
    found: license !== null,
    enabled: license?.enabled ?? null,
    productLink: license?.product_link ?? null,
    licenseKey: license?.license_key ?? null,
    buyerEmail: license?.buyer_email ?? null,
    uses: license?.uses ?? null,
    date: license?.date ?? null,
  };
}
