import type { HookContext } from "@w6w/types";

/**
 * eSignatures.com REST client.
 *
 * Verified against https://esignatures.com/docs/api (API version 1.3, fetched 2026-10-06) and
 * live probes. The vendor moved from `esignatures.io` to `esignatures.com`; both hostnames still
 * answer the same API today, but only `.com` is documented, so only `.com` is called and allowed.
 *
 * Credentials are never added here: the Auth `sign` hook stamps `Authorization: Basic`.
 */
export const API_BASE = "https://esignatures.com";
export const API_PREFIX = "/api";

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: string;
  body?: unknown;
}

/** The shape every eSignatures response shares; which of `status` / `data` appears varies. */
export interface ESigBody {
  status?: string;
  data?: unknown;
  // deno-lint-ignore no-explicit-any
  [key: string]: any;
}

/** The vendor's error body: `{"status":"error","data":{"error_code":…,"error_message":…}}`. */
export function errorParts(body: unknown): { code?: string; message?: string } {
  const b = body as { status?: string; data?: { error_code?: string; error_message?: string } };
  if (b && typeof b === "object" && b.status === "error") {
    return { code: b.data?.error_code, message: b.data?.error_message };
  }
  return {};
}

export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/** eSignatures spells booleans `"yes"` / `"no"`. Undefined stays undefined (field omitted). */
export function yesNo(v: boolean | undefined | null): "yes" | "no" | undefined {
  return v === true ? "yes" : v === false ? "no" : undefined;
}

/** Accept a JSON string or an already-parsed value; undefined/blank stays undefined. */
export function asOptionalJson<T>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

export function asJson<T>(value: unknown, label: string): T {
  const parsed = asOptionalJson<T>(value, label);
  if (parsed === undefined) throw new Error(`${label} is required`);
  return parsed;
}

/** Comma-separated string or array -> trimmed non-empty list. */
export function toList(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}

export function encodeId(id: string): string {
  return encodeURIComponent(String(id ?? "").trim());
}

export class ESignaturesClient {
  constructor(private readonly ctx: HookContext) {}

  /** Perform a call and return the parsed body. Throws on any vendor error. */
  async call(path: string, opts: RequestOptions = {}): Promise<ESigBody> {
    const method = opts.method ?? "GET";
    const headers: Record<string, string> = { accept: "application/json" };
    let body: string | undefined;
    if (opts.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    const res = await this.ctx.fetch(`${API_BASE}${API_PREFIX}${path}`, { method, headers, body });
    const text = await res.text();
    let parsed: ESigBody | null = null;
    try {
      parsed = text ? JSON.parse(text) as ESigBody : null;
    } catch {
      parsed = null;
    }
    const { code, message } = errorParts(parsed);
    if (!res.ok || code !== undefined || parsed?.status === "error") {
      const detail = code ? `${code}${message ? `: ${message}` : ""}` : text.slice(0, 300);
      throw new Error(`eSignatures ${method} ${path} failed (HTTP ${res.status}) ${detail}`.trim());
    }
    if (parsed === null) {
      throw new Error(
        `eSignatures ${method} ${path} returned a non-JSON body (HTTP ${res.status})`,
      );
    }
    return parsed;
  }

  /** Call and return the `data` member. */
  async data(path: string, opts: RequestOptions = {}): Promise<unknown> {
    return (await this.call(path, opts)).data;
  }

  /** Call and return `{ status }` — the shape of the mutation endpoints. */
  async status(path: string, opts: RequestOptions = {}): Promise<{ status: string | undefined }> {
    return { status: (await this.call(path, opts)).status };
  }
}

/** Signer fields shared by Add and Update (and the nested create form). */
export function signerBody(input: Record<string, unknown>): Record<string, unknown> {
  return compact({
    name: input.name,
    email: input.email,
    mobile: input.mobile,
    company_name: input.companyName,
    // An empty selection is omitted, not sent: the vendor reads `[]` as "skip sending the
    // request", which a host that serialises an unset multiselect as `[]` must not trigger.
    signature_request_delivery_methods: toList(
      input.signatureRequestDeliveryMethods as string[] | string,
    ),
    signed_document_delivery_method: input.signedDocumentDeliveryMethod,
    multi_factor_authentications: toList(input.multiFactorAuthentications as string[] | string),
    redirect_url: input.redirectUrl,
  });
}
