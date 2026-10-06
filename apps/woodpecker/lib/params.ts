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
export const select = (
  key: string,
  label: string,
  values: string[],
  o: Opts = {},
): Param =>
  ({
    key,
    label,
    type: "select",
    options: values.map((v) => ({ value: v, label: v })),
    ...o,
  }) as Param;

export const campaignId = str("campaign_id", "Campaign ID", {
  required: true,
  hint: "The campaign's numeric ID (see List Campaigns).",
});

export const PROSPECT_STATUSES = ["ACTIVE", "BOUNCED", "REPLIED", "BLACKLIST", "INVALID"];

/** Shared by the three v1 prospect listing actions. */
export const prospectPaging = [
  int("page", "Page", { hint: "1-based page number." }),
  int("per_page", "Per page", { hint: "Records per page. Vendor default 100, maximum 1000." }),
  str("sort", "Sort", {
    hint: "Column with a + or - prefix, comma-separated. Example: +company,-last_contacted.",
  }),
];

export const prospectsParam = json("prospects", "Prospects", {
  required: true,
  hint: 'JSON array of prospects. Only "email" is required; optional: status, first_name, ' +
    "last_name, company, website, linkedin_url, tags, title, phone, address, city, state, " +
    "country, industry, snippet1 to snippet15. At most 20,000 per request.",
});
