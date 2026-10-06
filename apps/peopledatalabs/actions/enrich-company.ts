import type { ActionDefinition } from "@w6w/types";
import { PdlClient, pick } from "../lib/client.ts";
import { dataIncludeParam, sandboxParam, titlecaseParam } from "../lib/params.ts";

type Input = Record<string, unknown>;

const KEYS = [
  "pdl_id",
  "name",
  "website",
  "profile",
  "ticker",
  "location",
  "street_address",
  "locality",
  "region",
  "country",
  "postal_code",
  "min_likelihood",
  "required",
  "data_include",
  "include_if_matched",
  "titlecase",
] as const;

const s = (key: string, label: string, hint?: string, placeholder?: string) => ({
  key,
  label,
  type: "string" as const,
  ...(hint ? { hint } : {}),
  ...(placeholder ? { placeholder } : {}),
});

const enrichCompany: ActionDefinition<Input> = {
  key: "enrich-company",
  type: "read",
  resource: "company",
  title: "Enrich Company",
  description:
    "One-to-one company match: returns the full PDL company profile. Needs at least one of pdl_id, name, website, ticker or profile. Costs one credit per match. No match is a normal outcome (found: false), not an error.",
  params: [
    s(
      "pdl_id",
      "PDL ID",
      "A PDL company ID or LinkedIn slug. When set, other match inputs are ignored.",
    ),
    s("name", "Company name", undefined, "Google, Inc."),
    s("website", "Website", undefined, "google.com"),
    s("profile", "Social profile URL", undefined, "linkedin.com/company/google"),
    s("ticker", "Stock ticker", "If publicly traded.", "GOOGL"),
    s("location", "HQ location", "Anything from a street address to a country."),
    s("street_address", "HQ street address"),
    s("locality", "HQ city"),
    s("region", "HQ state / region"),
    s("country", "HQ country"),
    s("postal_code", "HQ postal code"),
    {
      key: "min_likelihood",
      label: "Minimum likelihood",
      type: "number",
      validation: { min: 1, max: 10, integer: true },
      hint: "1-10, default 2. Below the threshold the answer is a no-match.",
    },
    s(
      "required",
      "Required fields",
      "Boolean expression over top-level fields a match must have, e.g. `website AND location`. You are only charged for matches that satisfy it.",
    ),
    dataIncludeParam("company"),
    {
      key: "include_if_matched",
      label: "Report matched inputs",
      type: "boolean",
      default: false,
    },
    titlecaseParam,
    sandboxParam,
  ],
  output: [
    { key: "found", type: "boolean", label: "True when PDL returned a match" },
    { key: "status", type: "number", label: "PDL status (200 match, 404 no match)" },
    { key: "likelihood", type: "number", label: "Match confidence, 1-10" },
    { key: "name", type: "string", label: "Company name" },
    { key: "website", type: "string", label: "Website" },
    { key: "id", type: "string", label: "PDL company ID" },
    { key: "matched", type: "array", label: "Inputs that matched (with include_if_matched)" },
  ],

  async execute(input, ctx) {
    return await new PdlClient(ctx).request("GET", "/v5/company/enrich", {
      query: pick(input, KEYS),
      sandbox: input.sandbox === true,
      notFound: {},
    });
  },
};

export default enrichCompany;
