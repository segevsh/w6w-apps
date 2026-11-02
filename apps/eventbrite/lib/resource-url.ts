import { API_URL } from "./client.ts";

/**
 * The guard in front of `get-by-url`: a URL a caller (or a webhook delivery) supplies, checked
 * before anything fetches it with the connection's credential. Only Eventbrite's own v3 API is
 * accepted, so the action can never carry the token to another host.
 *
 * The raw text is checked as well as the parsed URL, because URL parsing quietly normalizes what
 * we want to refuse: `..` segments collapse, `\` becomes `/`, and tabs/newlines are dropped.
 */

const BASE = new URL(API_URL);
const PATH_PREFIX = `${BASE.pathname}/`; // "/v3/"

/** A path segment: plain letters, digits, `_` and `-`. No dots, no percent-escapes. */
const SEGMENT_RE = /^[A-Za-z0-9_-]+$/;
/** A collection or sub-resource name (`ticket_classes`); anything else is an id. */
const NAME_RE = /^[a-z_]+$/;
/** Ids that look like names. */
const NAME_LIKE_IDS: ReadonlySet<string> = new Set(["me"]);

/** Collection names whose singular the suffix rules below get wrong. */
const SINGULAR: Readonly<Record<string, string>> = {
  media: "media",
  series: "series",
  seatmaps: "seatmap",
};

export class ResourceUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResourceUrlError";
  }
}

export interface CheckedResourceUrl {
  /** The URL to fetch, rebuilt from the checked parts (no credentials, no fragment). */
  url: URL;
  /** The record type the path names, e.g. `order` or `ticket_class`. */
  resourceType: string;
}

function singular(name: string): string {
  if (Object.hasOwn(SINGULAR, name)) return SINGULAR[name];
  if (name.endsWith("ies")) return `${name.slice(0, -3)}y`;
  if (/(ss|ch|sh|x)es$/.test(name)) return name.slice(0, -2);
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

/**
 * The record type a v3 path names: the singular of its last name segment.
 * `/v3/orders/1/` → `order`, `/v3/events/1/ticket_classes/2/` → `ticket_class`,
 * `/v3/users/me/` → `user`, `/v3/events/1/description/` → `description`.
 */
export function resourceTypeOf(segments: readonly string[]): string {
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (NAME_RE.test(s) && !NAME_LIKE_IDS.has(s)) return singular(s);
  }
  return "unknown";
}

/** Accept `https://www.eventbriteapi.com/v3/…` and nothing else. Throws `ResourceUrlError`. */
export function checkResourceUrl(input: unknown): CheckedResourceUrl {
  if (typeof input !== "string" || input.trim() === "") {
    throw new ResourceUrlError("URL is required.");
  }
  const raw = input.trim();
  const refuse = (why: string): never => {
    throw new ResourceUrlError(`Refusing URL ${JSON.stringify(raw)}: ${why}.`);
  };

  // deno-lint-ignore no-control-regex
  if (/[\s\x00-\x1f\x7f]/.test(raw)) refuse("it contains whitespace or control characters");
  if (raw.includes("\\")) refuse("it contains a backslash");
  if (/%(2e|2f|5c)/i.test(raw)) refuse("it contains an encoded dot or slash");
  if (/(^|\/)\.\.?(\/|\?|#|$)/.test(raw)) refuse("it contains a `.` or `..` path segment");

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return refuse("it is not a valid URL");
  }
  if (url.protocol !== "https:") refuse("only https is allowed");
  if (url.username !== "" || url.password !== "") refuse("it carries credentials");
  if (url.host !== BASE.host) refuse(`only ${BASE.host} is allowed`);
  if (!url.pathname.startsWith(PATH_PREFIX)) refuse(`the path must start with ${PATH_PREFIX}`);

  const segments = url.pathname.slice(PATH_PREFIX.length).split("/");
  if (segments.at(-1) === "") segments.pop(); // the trailing slash Eventbrite paths end with
  if (segments.length === 0) refuse("it names no resource");
  if (!segments.every((s) => SEGMENT_RE.test(s))) {
    refuse("a path segment has unexpected characters");
  }

  const safe = new URL(`${BASE.origin}${url.pathname}${url.search}`);
  return { url: safe, resourceType: resourceTypeOf(segments) };
}

/** `"venue, organizer,,"` → `"venue,organizer"`; `undefined` when nothing is left. */
export function normalizeExpand(expand: unknown): string | undefined {
  if (expand === undefined || expand === null) return undefined;
  const list = Array.isArray(expand) ? expand.map(String) : String(expand).split(",");
  const items = list.map((s) => s.trim()).filter((s) => s !== "");
  for (const item of items) {
    if (!/^[A-Za-z0-9_.]+$/.test(item)) {
      throw new ResourceUrlError(`Invalid expand value ${JSON.stringify(item)}.`);
    }
  }
  return items.length > 0 ? items.join(",") : undefined;
}
