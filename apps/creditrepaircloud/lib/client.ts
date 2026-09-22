import type { HookContext, OutputField } from "@w6w/types";

/**
 * Credit Repair Cloud API client — hand-rolled, because this vendor's API is
 * both tiny and self-contradictory, and its responses are XML.
 *
 * ## What was verified, and how
 *
 * Every path, parameter name and enum below comes from Credit Repair Cloud's
 * own documentation (`app.creditrepaircloud.com/webapi/apimethods` and its
 * sibling pages: `overview`, `insertrecords`, `updaterecords`, `deleterecords`,
 * `viewrecord`, `insertrecords_affiliate`, `updaterecords_affiliate`,
 * `deleterecords_affiliate`, `viewrecord_affiliate`, `error-messages`,
 * `examples`), read in full on 2026-09-22. That is the whole API: **eight**
 * endpoints, four for Lead/Client records and four for Affiliate records, each
 * one insert/update/delete/view. There is no list, no search, no webhook and no
 * pagination surface to build against, and this app declares none.
 *
 * ## Where the request goes: credentials in the query string, `xmlData` in the body
 *
 * The documentation contradicts itself about the request shape. Its sample URL
 * shows all three parameters (`apiauthkey`, `secretkey`, `xmlData`) as query
 * string parameters, while the prose says "Use the POST method... pass the
 * xmlData as a POST parameter".
 *
 * Measured live on 2026-09-22 with four real `curl`-equivalent POSTs against the
 * production host, using an obviously invalid key pair (`deadbeef` twice — no
 * working credential was needed, and none was used). All four answered HTTP 200
 * with the same `<error_no>4406</error_no>` envelope, which is the shape of "the
 * parameters were read and the key is wrong":
 *
 *   | Placement                                        | Answer |
 *   | ------------------------------------------------ | ------ |
 *   | all three in the query string                     | 4406 |
 *   | all three in the form-encoded body                | 4406 |
 *   | **credentials in the query string, `xmlData` in the body** (this app) | 4406 |
 *   | the same split against `/api/affiliate/viewRecord` | 4406 |
 *
 * A request with `xmlData` in the body and *no* credentials answers 4405
 * ("Incorrect API key parameter or API key parameter value") instead, which is
 * what pins the placement question down: the backend accepts the three
 * parameters from either place, interchangeably — the classic PHP `$_REQUEST`
 * merge.
 *
 * So this app does both documented things at once, in the split that keeps
 * credentials out of Actions: {@link signUrl} appends `apiauthkey`/`secretkey`
 * to the URL query string, and it is called only from the Auth `sign`/`test`
 * hooks; every Action POSTs `application/x-www-form-urlencoded` with a single
 * `xmlData=<url-encoded xml>` body and never sees a credential.
 *
 * ## The response is XML, and `parseXmlResponse` is the whole reader
 *
 * The docs never show a response body. Verified live on 2026-09-22 by a real
 * unauthenticated `curl -X POST .../api/lead/viewRecord`, verbatim:
 *
 * ```xml
 * <?xml version="1.0"?>
 * <response>
 *   <success>False</success>
 *   <result>
 *     <errors>
 *       <error_no>4406</error_no>
 *       <error_message>Wrong API Key or Secret key</error_message>
 *     </errors>
 *   </result>
 * </response>
 * ```
 *
 * Note the content type this vendor sends with that body: `text/html;
 * charset=UTF-8`, not an XML type. Nothing here reads the content type for that
 * reason — the body is parsed as text and the verdict comes from `<success>`.
 * HTTP status is equally uninformative: every one of the probes above answered
 * `200`, including a wrong API key.
 *
 * `<success>` is the literal string `True` or `False`. On failure the vendor's
 * numeric code and its own prose live in `<error_no>`/`<error_message>`; the
 * full vocabulary is {@link ERROR_MESSAGES}. No XML library is allowed as a
 * runtime dependency, so the envelope is read with the three small regex
 * helpers below — the payload is flat enough that this is honest rather than
 * fragile, and a body that does not match the envelope is reported as
 * unreadable instead of being guessed at.
 *
 * The success-response shape could NOT be verified — no test account or
 * credentials were available — so nothing here invents field names inside a
 * successful `<result>`. {@link parseXmlResponse} returns every direct child of
 * `<result>` as a flat string map and lets the caller decide, and the README
 * states the gap plainly.
 */

/** The single host all eight endpoints live on. */
export const API_BASE = "https://app.creditrepaircloud.com";

/** Every endpoint is `POST <API_BASE>/api/{lead|affiliate}/{method}`. */
export const API_PREFIX = "/api";

/**
 * Which element the fields are wrapped in. Insert/update use the resource's own
 * element (`<lead>`, `<affiliate>`); the Lead delete/view pair uses `<client>`
 * — the vendor's own example XML on those two pages, where the table lists
 * neither the element nor the `id`.
 */
export type XmlRoot = "lead" | "client" | "affiliate";

/** One endpoint: where it is, and which element its fields are wrapped in. */
export interface Endpoint {
  path: string;
  root: XmlRoot;
}

export const LEAD_INSERT: Endpoint = { path: `${API_PREFIX}/lead/insertRecord`, root: "lead" };
export const LEAD_UPDATE: Endpoint = { path: `${API_PREFIX}/lead/updateRecord`, root: "lead" };
export const LEAD_DELETE: Endpoint = { path: `${API_PREFIX}/lead/deleteRecord`, root: "client" };
export const LEAD_VIEW: Endpoint = { path: `${API_PREFIX}/lead/viewRecord`, root: "client" };
export const AFFILIATE_INSERT: Endpoint = {
  path: `${API_PREFIX}/affiliate/insertRecord`,
  root: "affiliate",
};
export const AFFILIATE_UPDATE: Endpoint = {
  path: `${API_PREFIX}/affiliate/updateRecord`,
  root: "affiliate",
};
export const AFFILIATE_DELETE: Endpoint = {
  path: `${API_PREFIX}/affiliate/deleteRecord`,
  root: "affiliate",
};
export const AFFILIATE_VIEW: Endpoint = {
  path: `${API_PREFIX}/affiliate/viewRecord`,
  root: "affiliate",
};

/**
 * The vendor's complete error vocabulary, from `webapi/error-messages`
 * (verified 2026-09-22). Quoted in the client's own error messages so a caller
 * reads the vendor's meaning, not just its number.
 */
export const ERROR_MESSAGES: Record<number, string> = {
  4401: "Invalid parameter",
  4402: "Mandatory field missing",
  4403: "Email address Invalid",
  4404: "XML parsing error",
  4405: "Incorrect API key parameter or API key parameter value",
  4406: "Wrong API Key or Secret key",
  4407: "API Key is inactive",
  4408: "Internal server error while processing this request",
  4409: "Number of API calls exceeded",
  4410: "Wrong ID in update",
  4411: "Incorrect Secret key parameter or Secret key parameter value",
  4412: "Custom error message",
  4413: "Incorrect Client ID",
  4416: "Referred by not found",
  4417: "Incorrect Affiliate ID",
};

/**
 * The four codes that mean *the credential itself* was refused, as opposed to
 * "the credential was fine and the request was not". This is the classification
 * the Auth `test` hook is built on, and it is drawn from the vendor's own
 * meanings: 4405 is a bad API-key parameter, 4411 a bad secret-key parameter,
 * 4406 "Wrong API Key or Secret key" and 4407 an inactive key. Every other
 * code — including 4413 "Incorrect Client ID", which the credential probe
 * expects — means the credentials were accepted.
 */
export const CREDENTIAL_ERROR_CODES: ReadonlySet<number> = new Set([4405, 4406, 4407, 4411]);

/** Credit Repair Cloud's two credentials. Both are required, both are secrets. */
export interface CreditRepairCloudCredential {
  /** `apiauthkey` — the account's API key. */
  apiauthkey: string;
  /** `secretkey` — the matching secret. */
  secretkey: string;
}

// ------------------------------------------------------------------- request --

/**
 * Append both credentials to a request URL's query string.
 *
 * The one place the credential placement is built, exported so the Auth `sign`
 * hook and its `test` probe exercise the identical code path — a hand-rolled
 * second copy is how a probe ends up sending a request the real calls do not.
 * The credentials go nowhere else: not in a header, not in the body, and never
 * into an Action.
 */
export function signUrl(
  url: string,
  credential: Partial<CreditRepairCloudCredential>,
): string {
  const signed = new URL(url);
  signed.searchParams.set("apiauthkey", credential.apiauthkey ?? "");
  signed.searchParams.set("secretkey", credential.secretkey ?? "");
  return signed.toString();
}

/**
 * The form-encoded body every endpoint takes: one `xmlData` parameter holding
 * the whole document. `URLSearchParams` does the percent-encoding.
 */
export function formBody(xml: string): string {
  return new URLSearchParams({ xmlData: xml }).toString();
}

// ----------------------------------------------------------------- XML build --

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

/**
 * Escape a user-supplied value for embedding in an element's text.
 *
 * Every value this app puts on the wire goes through here. A lead's memo or a
 * company name containing `&` or `<` is ordinary data; unescaped it is a
 * parsing error (4404) at best and a corrupted record at worst.
 */
export function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

/** A valid XML element name — the only shape a field key may take. */
const XML_NAME = /^[A-Za-z_][\w.:-]*$/;

/**
 * Build the documented `<crcloud>…</crcloud>` document from a field map.
 *
 * Field keys ARE the vendor's own XML element names (`firstname`, `post_code`,
 * `send_setup_password_info_via_email`, …) — no camelCase-to-snake_case mapping
 * layer, so the wire vocabulary is exactly what the Action's params say.
 *
 * An empty, `undefined` or `null` value is omitted rather than sent as an empty
 * element: every one of these fields is optional in the vendor's tables except
 * the ones each Action marks required, and an empty element is a value the
 * vendor would have to guess about.
 */
export function buildXml(root: XmlRoot, fields: Record<string, unknown>): string {
  const body = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => {
      if (!XML_NAME.test(key)) throw new Error(`not a valid XML element name: ${key}`);
      return `<${key}>${escapeXml(String(value))}</${key}>`;
    })
    .join("");
  return `<crcloud><${root}>${body}</${root}></crcloud>`;
}

// ---------------------------------------------------------------- XML parse --

/** The parsed form of one response envelope. */
export interface ParsedResponse {
  /** The literal `<success>` value: `True` becomes `true`, `False` becomes `false`. */
  success: boolean;
  /** `<error_no>`, or `null` when the vendor sent none. */
  errorCode: number | null;
  /** `<error_message>`, or `null`. Entities are decoded. */
  errorMessage: string | null;
  /**
   * Every direct child of `<result>` as a flat string map, or `null` when the
   * response carried no `<result>`. Deliberately generic: what a *successful*
   * `viewRecord` returns is UNVERIFIED, so nothing here claims a field name.
   */
  result: Record<string, string> | null;
  /** The response body, verbatim. */
  raw: string;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode the five XML entities plus numeric character references. */
export function decodeXmlEntities(value: string): string {
  return value.replace(/&(#[0-9]+|#x[0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g, (entity) => {
    if (entity.startsWith("&#x") || entity.startsWith("&#X")) {
      const code = Number.parseInt(entity.slice(3, -1), 16);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : entity;
    }
    if (entity.startsWith("&#")) {
      const code = Number.parseInt(entity.slice(2, -1), 10);
      return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : entity;
    }
    return NAMED_ENTITIES[entity.slice(1, -1)] ?? entity;
  });
}

/**
 * Drop markup, keeping the text between tags.
 *
 * A tag becomes a single space, and runs of whitespace collapse: `<a><b>x</b>y
 * </a>` flattens to `x y`, not `xy`. That only matters for the error envelope,
 * whose `<errors>` child is markup rather than a scalar.
 */
function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/**
 * The text of the first `<name>` element. Self-closing counts as empty text; a
 * missing element is `null` — "the vendor said nothing", never "".
 */
function tagText(xml: string, name: string): string | null {
  const pair = new RegExp(`<${name}\\b(?:\\s[^>]*?)?>([\\s\\S]*?)</${name}\\s*>`, "i").exec(xml);
  if (pair) return decodeXmlEntities(stripTags(pair[1])).trim();
  const empty = new RegExp(`<${name}\\b(?:\\s[^>]*?)?/>`, "i").test(xml);
  return empty ? "" : null;
}

const XML_TAG = /<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

/**
 * Every direct child of an element's inner content, as a flat string map.
 *
 * Depth-tracked rather than matched flatly, so a nested element's text lands in
 * its parent's value (tags stripped) instead of being mistaken for a sibling.
 * That is exactly what the error envelope needs: `<result>`'s only child here
 * is `<errors>`, and `error_no`/`error_message` are read separately by
 * {@link parseXmlResponse}.
 */
export function directChildFields(inner: string): Record<string, string> {
  const out: Record<string, string> = {};
  let depth = 0;
  let name: string | null = null;
  let start = 0;

  for (const match of inner.matchAll(XML_TAG)) {
    const at = match.index ?? 0;
    const closing = match[1] === "/";
    const tag = match[2];
    const selfClosing = match[4] === "/";

    if (closing) {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && name !== null) {
        // First wins, matching how the scalar tags above are read.
        if (!(name in out)) {
          out[name] = decodeXmlEntities(stripTags(inner.slice(start, at))).trim();
        }
        name = null;
      }
      continue;
    }

    if (selfClosing) {
      if (depth === 0 && !(tag in out)) out[tag] = "";
      continue;
    }

    if (depth === 0) {
      name = tag;
      start = at + match[0].length;
    }
    depth++;
  }

  // An unterminated element still carries whatever text arrived: report it
  // rather than dropping a value the vendor did send.
  if (name !== null && !(name in out)) {
    out[name] = decodeXmlEntities(stripTags(inner.slice(start))).trim();
  }
  return out;
}

/** Every direct child of `<result>` as a flat map, or `null` when absent. */
export function resultFields(xml: string): Record<string, string> | null {
  const match = /<result\b(?:\s[^>]*?)?>([\s\S]*)<\/result\s*>/i.exec(xml);
  return match ? directChildFields(match[1]) : null;
}

/**
 * Parse one response envelope.
 *
 * Returns `null` when the body is not this API's envelope at all (empty, HTML
 * from a proxy, an SPA's index page) or when `<success>` holds something other
 * than `True`/`False`. "I could not read this" is a distinct answer from "the
 * vendor said no", and only the caller can decide which it is — so this never
 * guesses.
 */
export function parseXmlResponse(raw: string): ParsedResponse | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;

  const success = tagText(raw, "success");
  if (success === null) return null;
  const verdict = success.toLowerCase();
  if (verdict !== "true" && verdict !== "false") return null;

  const code = tagText(raw, "error_no");
  const numeric = code !== null && /^-?\d+$/.test(code) ? Number(code) : null;

  return {
    success: verdict === "true",
    errorCode: numeric,
    errorMessage: tagText(raw, "error_message"),
    result: resultFields(raw),
    raw,
  };
}

/** Cap a body for inclusion in an error message. */
export function truncate(value: string, limit = 300): string {
  const flat = value.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat;
}

/**
 * The message every Action fails with when the vendor answers
 * `<success>False</success>`.
 *
 * The vendor always answers HTTP 200, so this is the only signal there is. The
 * credential codes get an extra sentence, because "Wrong API Key or Secret key"
 * on its own sends people looking at their request when the fix is on the
 * Connection.
 */
export function describeVendorError(parsed: ParsedResponse): string {
  const code = parsed.errorCode;
  const meaning = code !== null ? ERROR_MESSAGES[code] : undefined;
  const label = code !== null
    ? `error ${code}${meaning ? ` (${meaning})` : ""}`
    : "with no error code";
  const detail = parsed.errorMessage ? `: ${parsed.errorMessage}` : "";
  const hint = code !== null && CREDENTIAL_ERROR_CODES.has(code)
    ? " — Credit Repair Cloud refused the credential on this request; reconnect the Connection" +
      " with the API key and secret key from Credit Repair Cloud > Settings > API"
    : "";
  return `Credit Repair Cloud rejected the request (${label})${detail}${hint}`;
}

/**
 * The output every Action returns: the parsed envelope, verbatim.
 *
 * `result` is the generic direct-child map, not a named record: what a
 * successful `viewRecord` returns was never observed, so no Action claims a
 * field inside it. See `lib/client.ts`'s header.
 */
export const ENVELOPE_OUTPUT: OutputField[] = [
  { key: "success", type: "boolean", label: "Success" },
  { key: "errorCode", type: "number", label: "Vendor error code" },
  { key: "errorMessage", type: "string", label: "Vendor error message" },
  { key: "result", type: "object", label: "Result fields (the vendor's own <result> children)" },
  { key: "raw", type: "string", label: "Raw XML response" },
];

/** Raised for a response this client cannot read, or one the vendor refused. */
export class CreditRepairCloudError extends Error {
  constructor(message: string, readonly parsed: ParsedResponse | null = null) {
    super(message);
    this.name = "CreditRepairCloudError";
  }
}

/**
 * One endpoint, one call.
 *
 * `send(fields)` builds the document and POSTs it; `request(xml)` is the raw
 * form. The verdict is read from the BODY, never from the HTTP status — this
 * vendor answers 200 for a wrong API key, an unknown record id and a successful
 * write alike, so a status-based check would report every failure as success.
 */
export class CreditRepairCloudClient {
  constructor(private readonly ctx: HookContext, private readonly endpoint: Endpoint) {}

  async send(fields: Record<string, unknown>): Promise<ParsedResponse> {
    return await this.request(buildXml(this.endpoint.root, fields));
  }

  async request(xml: string): Promise<ParsedResponse> {
    const res = await this.ctx.fetch(`${API_BASE}${this.endpoint.path}`, {
      method: "POST",
      headers: {
        accept: "text/xml, application/xml",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: formBody(xml),
    });

    const raw = await res.text().catch(() => "");
    const parsed = parseXmlResponse(raw);
    if (!parsed) {
      throw new CreditRepairCloudError(
        `Credit Repair Cloud returned an unreadable response for ${this.endpoint.path} ` +
          `(HTTP ${res.status}): ${truncate(raw) || "(empty body)"}`,
      );
    }
    if (!parsed.success) throw new CreditRepairCloudError(describeVendorError(parsed), parsed);
    return parsed;
  }
}
