import type { Param } from "@w6w/types";
import { compact, type Query } from "./client.ts";

const s = (key: string, label: string, hint?: string): Param => ({
  key,
  label,
  type: "string",
  ...(hint ? { hint } : {}),
});

const MULTI = " Accepts a single value or a comma-separated list.";

/**
 * Filters shared by `GET /analytics` and `GET /events`. Each is a query
 * parameter of the same name on both endpoints.
 */
export const FILTER_PARAMS: Param[] = [
  s("domain", "Domain", "Short-link domain to filter by." + MULTI),
  s("key", "Link slug", "Slug of one short link. Must be used with `domain`."),
  s("linkId", "Link ID", MULTI.trim()),
  s("externalId", "Link external ID", "Must be prefixed with `ext_`."),
  s("tenantId", "Tenant ID", MULTI.trim()),
  s("tagId", "Tag ID", MULTI.trim()),
  s("folderId", "Folder ID", MULTI.trim()),
  s("customerId", "Customer ID"),
  {
    key: "interval",
    label: "Interval",
    type: "select",
    options: ["24h", "7d", "30d", "90d", "1y", "mtd", "qtd", "ytd", "all"].map((v) => ({
      value: v,
      label: v,
    })),
    hint: "Defaults to 24h. `start` takes precedence when set.",
  },
  s("start", "Start", "ISO 8601 start of the window. Takes precedence over `interval`."),
  s("end", "End", "ISO 8601 end of the window. Defaults to now."),
  s(
    "timezone",
    "Timezone",
    "IANA zone that aligns timeseries buckets, e.g. America/New_York. Defaults to UTC.",
  ),
  s("country", "Country", "2-letter ISO 3166-1 code."),
  s("city", "City", MULTI.trim()),
  s("region", "Region", "ISO 3166-2 region code." + MULTI),
  s("continent", "Continent", "AF, AN, AS, EU, NA, OC or SA."),
  s("device", "Device", MULTI.trim()),
  s("browser", "Browser", MULTI.trim()),
  s("os", "Operating system", MULTI.trim()),
  s("trigger", "Trigger", "qr, link or pageview."),
  s("eventName", "Conversion event name", "Lead and sale events only."),
  s("referer", "Referer hostname", MULTI.trim()),
  s("refererUrl", "Referer URL", MULTI.trim()),
  s("url", "Destination URL", MULTI.trim()),
  s("utm_source", "UTM source", MULTI.trim()),
  s("utm_medium", "UTM medium", MULTI.trim()),
  s("utm_campaign", "UTM campaign", MULTI.trim()),
  s("utm_term", "UTM term", MULTI.trim()),
  s("utm_content", "UTM content", MULTI.trim()),
  {
    key: "root",
    label: "Root domains only",
    type: "boolean",
    hint: "true: domains only. false: links only.",
  },
  {
    key: "saleType",
    label: "Sale type",
    type: "select",
    options: [{ value: "new", label: "New" }, { value: "recurring", label: "Recurring" }],
  },
  s(
    "query",
    "Metadata query",
    "Search lead/sale events by custom metadata, e.g. metadata['key']:'value'.",
  ),
];

/** Pick the filter values out of an action's input, dropping unset ones. */
export function filterQuery(input: Record<string, unknown>): Query {
  const out: Record<string, unknown> = {};
  for (const p of FILTER_PARAMS) out[p.key] = input[p.key];
  return compact(out) as Query;
}
