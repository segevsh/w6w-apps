import type { HookContext } from "@w6w/types";

/**
 * Mailjet runs **two API versions side by side on one host**, and which one you
 * want depends on the resource — this is not a migration in progress, it is the
 * documented steady state:
 *
 *   - `https://api.mailjet.com/v3/REST/<resource>` — everything stateful:
 *     contacts, contact lists, templates, senders, message metadata, statistics.
 *   - `https://api.mailjet.com/v3.1/send` — the transactional Send API, and
 *     *only* `send`. There is no `/v3.1/REST/...`.
 *
 * Verified 2026-08-03 against Mailjet's own documentation source
 * (`github.com/mailjet/api-documentation`, the repo that generates
 * dev.mailjet.com) and against the rendered reference at
 * `dev.mailjet.com/email/reference/`. Every `v3.1` URL in that corpus is
 * `https://api.mailjet.com/v3.1/send`; every other endpoint is `v3/REST`.
 *
 * v3 also has its own `/v3/send` Send API, still supported. This app implements
 * v3.1 only: it is Mailjet's own recommendation for new integrations and it
 * reports per-recipient errors, where v3's response is a flat blob. See
 * README.md "Send API version" for the trade-off (v3 allows 100 messages per
 * call against v3.1's 50).
 *
 * ## Regional endpoints
 *
 * `api.eu.mailjet.com` **does** resolve — but to the *same* IP as
 * `api.mailjet.com` (checked on the wire 2026-08-03: both names came back on one
 * `getent hosts` line, i.e. an alias, 35.187.79.8). Mailjet's docs describe no
 * regional split and never print that hostname. So the egress allowlist declares
 * `api.mailjet.com` alone — putting an undocumented alias on an allowlist buys
 * nothing and widens the sandbox on a guess. (Contrast Customer.io and Mailgun,
 * whose regional hosts are documented, distinct deployments with separate data.)
 *
 * ## Auth
 *
 * HTTP Basic, API key as the username and secret key as the password. Confirmed
 * on the wire, not just from docs — an unauthenticated `GET
 * https://api.mailjet.com/v3/REST/apikey` answers:
 *
 *     HTTP/2 401
 *     www-authenticate: Basic realm="Provide an apiKey and secretKey"
 *
 * No header is set here. The auth `sign` hook injects `Authorization`.
 */
export const API_HOST = "https://api.mailjet.com";

/** v3 REST resources — contacts, lists, templates, senders, messages, stats. */
export const API_V3 = `${API_HOST}/v3/REST`;

/** v3.1 Send API. The only v3.1 endpoint Mailjet documents. */
export const SEND_V31 = `${API_HOST}/v3.1/send`;

/**
 * The v3 REST envelope. Every `v3/REST` list and single-object read returns this
 * — a single-object read is a one-element `Data` array, not a bare object.
 * Documented in the overview ("all request and response bodies are encoded in
 * JSON") and visible in every worked example in the docs repo.
 */
export interface MailjetEnvelope<T = unknown> {
  Count?: number;
  Data?: T[];
  Total?: number;
}

/**
 * Mailjet's v3 error body. The shape is looser than most vendors': `ErrorMessage`
 * is a **string on most failures but an object** on the bulk contact-management
 * endpoints, where it carries per-item errors (see `_contacts_bulk.md` in the
 * docs repo, which shows `"ErrorMessage": { "ContactsLists": [...] }`).
 * `formatError` handles both rather than assuming the common case.
 *
 * The errors overview (`dev.mailjet.com/email/reference/overview/errors/`) states
 * only that responses "usually include an Error Identifier, Error Message and
 * Status Code" — it publishes no field-level schema, so every field here is
 * optional by design and nothing downstream may depend on one being present.
 */
export interface MailjetErrorBody {
  ErrorInfo?: string;
  ErrorMessage?: string | Record<string, unknown>;
  ErrorIdentifier?: string;
  StatusCode?: number;
}

/** Render a vendor error body for a human without ever echoing request material. */
export function formatError(status: number, body: MailjetErrorBody | undefined): string {
  if (!body) return `HTTP ${status}`;
  const message = typeof body.ErrorMessage === "string"
    ? body.ErrorMessage
    : body.ErrorMessage !== undefined
    ? JSON.stringify(body.ErrorMessage)
    : undefined;
  const parts = [message, body.ErrorInfo].filter((p): p is string => !!p);
  return parts.length ? `HTTP ${status}: ${parts.join(" — ")}` : `HTTP ${status}`;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
}

/**
 * Thin wrapper over `ctx.fetch`. Deliberately sets **no** `Authorization` header
 * — the runtime routes every request through the auth `sign` hook, which is the
 * only place in this app that sees the credential.
 */
export class MailjetClient {
  constructor(private ctx: HookContext) {}

  async request<T = unknown>(url: string, options: RequestOptions = {}): Promise<T> {
    const target = new URL(url);
    if (options.query) {
      for (const [k, v] of Object.entries(options.query)) {
        if (v === undefined || v === null || v === "") continue;
        target.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = { accept: "application/json" };
    const init: RequestInit = { method: options.method ?? "GET", headers };
    if (options.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }

    const res = await this.ctx.fetch(target.toString(), init);
    const text = await res.text();

    if (!res.ok) {
      let parsed: MailjetErrorBody | undefined;
      try {
        parsed = JSON.parse(text) as MailjetErrorBody;
      } catch {
        // Non-JSON error body (Mailjet answers a bare 401 with `text/html`) —
        // formatError falls back to the status alone.
      }
      throw new Error(
        `Mailjet ${init.method} ${target.pathname} returned ${formatError(res.status, parsed)}`,
      );
    }

    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  /** A `v3/REST` call. `path` is the resource segment, e.g. `/contact`. */
  v3<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(`${API_V3}${path}`, options);
  }
}

/**
 * Mailjet's v3 REST pagination, documented once in the API overview and shared by
 * every list endpoint: `Limit` (default 10, **max 1000**), `Offset`, `Sort`.
 * Capitalised, unlike almost every other vendor in this pack.
 */
export interface PageInput {
  limit?: number;
  offset?: number;
  sort?: string;
}

export function pageQuery(input: PageInput): Record<string, string | number | undefined> {
  return {
    Limit: input.limit,
    Offset: input.offset,
    Sort: input.sort,
  };
}

/** Reusable param descriptors for the three pagination knobs. */
export const PAGE_PARAMS = [
  {
    key: "limit",
    label: "Limit",
    type: "number" as const,
    default: 10,
    hint: "Results per page. Mailjet's default is 10; the maximum is 1000.",
  },
  {
    key: "offset",
    label: "Offset",
    type: "number" as const,
    hint: "Index of the first result — pass the previous page's `limit + offset` to page on.",
  },
  {
    key: "sort",
    label: "Sort",
    type: "string" as const,
    hint:
      "Property name, optionally with ` DESC` — e.g. `ArrivedAt DESC`. Not every property is sortable.",
  },
];

/**
 * An address in the v3.1 Send API's `{ Email, Name? }` shape.
 *
 * Accepts what a workflow author is likely to have on hand: a bare address, a
 * `Name <addr>` string, a comma-separated list of either, or an already-shaped
 * array. Mirrors `brevo`'s `parseEmailList`, retargeted at Mailjet's capitalised
 * field names.
 */
export interface MailjetAddress {
  Email: string;
  Name?: string;
}

type AddressInput =
  | string
  | Array<{ Email?: string; email?: string; Name?: string; name?: string }>
  | undefined;

export function parseAddressList(input: AddressInput): MailjetAddress[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((entry) => {
        const email = entry.Email ?? entry.email;
        const name = entry.Name ?? entry.name;
        if (!email) return undefined;
        return name ? { Email: email, Name: name } : { Email: email };
      })
      .filter((e): e is MailjetAddress => e !== undefined);
  }
  return splitAddresses(input).map((raw) => {
    const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
    if (!match) return { Email: raw };
    const name = match[1].trim().replace(/^"|"$/g, "");
    const email = match[2].trim();
    return name ? { Email: email, Name: name } : { Email: email };
  });
}

/**
 * Split a recipient string on commas that actually separate addresses.
 *
 * A naive `split(",")` corrupts the common `"Lovelace, Ada" <ada@x.com>` form:
 * it yields `"Lovelace` and `Ada" <ada@x.com>`, and the first of those parses as
 * an address of `"Lovelace` — a syntactically plausible, entirely fictional
 * recipient that Mailjet will happily accept into the payload. Silently mailing
 * a garbage address is worse than rejecting the input, so commas inside double
 * quotes or inside angle brackets are not separators.
 */
function splitAddresses(input: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  let inAngles = false;

  for (const char of input) {
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "<" && !inQuotes) inAngles = true;
    else if (char === ">" && !inQuotes) inAngles = false;
    else if (char === "," && !inQuotes && !inAngles) {
      out.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  out.push(current);

  return out.map((s) => s.trim()).filter(Boolean);
}

/** Parse a single address (`From`, `ReplyTo`) — first entry of a parsed list. */
export function parseAddress(input: AddressInput): MailjetAddress | undefined {
  return parseAddressList(input)[0];
}

/** Drop `undefined` and empty-string values so optionals never overwrite vendor defaults. */
export function compact<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "") continue;
    out[key as keyof T] = value as T[keyof T];
  }
  return out;
}
