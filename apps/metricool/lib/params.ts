import type { Param } from "@w6w/types";

type Opts = { required?: boolean; hint?: string; default?: string | number | boolean };

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", validation: { integer: true }, ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const json = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "json", ...o }) as Param;

/** The brand every non-account call is scoped to. `brand-list` returns the ids. */
export const blogId: Param = str("blogId", "Brand ID (blogId)", {
  required: true,
  hint: "The Metricool brand's id: the `id` of a brand from List Brands, or the number in the " +
    "brand's browser URL.",
});

export const timezone: Param = str("timezone", "Timezone", {
  hint: "IANA timezone for the date range, e.g. Europe/Madrid.",
});

/** The networks the analytics endpoints list as supported (swagger `network` parameter). */
export const analyticsNetworks = [
  "tiktok",
  "tiktokads",
  "pinterest",
  "youtube",
  "facebook",
  "gmb",
  "instagram",
  "linkedin",
  "twitter",
  "twitch",
].map((value) => ({ value, label: value }));

export const select = (
  key: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  o: Opts = {},
): Param => ({ key, label, type: "select", options, ...o }) as Param;

/** The `network`/`metric`/`from`/`to`/`subject`/`scope` set the metric endpoints share. */
export const metricParams: Param[] = [
  select("network", "Network", analyticsNetworks, { required: true }),
  str("metric", "Metric", {
    required: true,
    hint: "Case-insensitive and per network, e.g. followers_count (tiktok), pageFollows " +
      "(facebook), views (youtube). The vendor's metric list is in its API reference.",
  }),
  str("from", "From", {
    required: true,
    hint: "ISO 8601 with offset, e.g. 2026-01-01T00:00:00+01:00.",
  }),
  str("to", "To", {
    required: true,
    hint: "ISO 8601 with offset, e.g. 2026-01-31T23:59:59+01:00.",
  }),
  timezone,
  str("subject", "Subject", {
    hint: "Network-specific filter such as posts, reels, account. Mandatory for Instagram " +
      "(account, posts, reels, stories, competitors, collabs).",
  }),
  str("scope", "Scope", { hint: "Second filter, e.g. viewed or published (YouTube)." }),
];

export const metricQueryKeys = ["network", "metric", "from", "to", "timezone", "subject", "scope"];
