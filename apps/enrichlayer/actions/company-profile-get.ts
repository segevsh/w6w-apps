import type { ActionDefinition } from "@w6w/types";
import { EnrichLayerClient } from "../lib/client.ts";

interface Input {
  url: string;
  categories?: string;
  fundingData?: string;
  exitData?: string;
  acquisitions?: string;
  extra?: string;
  useCache?: string;
  fallbackToCache?: string;
  liveFetch?: string;
}

/** `GET /company` */
const companyProfileGet: ActionDefinition<Input> = {
  key: "company-profile-get",
  type: "read",
  resource: "company",
  title: "Get Company Profile",
  description:
    "Return the structured profile of a company from its profile URL (1 credit). Categories, funding, exits, acquisitions and extras cost 1 extra credit each.",
  params: [
    { key: "url", label: "Company profile URL", type: "string", required: true },
    {
      key: "categories",
      label: "Categories",
      type: "select",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "fundingData",
      label: "Funding rounds",
      type: "select",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "exitData",
      label: "Investment exits",
      type: "select",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "acquisitions",
      label: "Acquisitions",
      type: "select",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "extra",
      label: "Extra details",
      type: "select",
      hint: "Crunchbase ranking, contacts, social accounts, IPO and investor data.",
      options: [{ value: "exclude", label: "exclude" }, { value: "include", label: "include" }],
    },
    {
      key: "useCache",
      label: "Cache freshness",
      type: "select",
      hint:
        "if-present reads the cache whatever its age; if-recent makes a best effort at a profile no older than 29 days and costs 1 extra credit. Omit for the vendor default.",
      options: [{ value: "if-present", label: "if-present" }, {
        value: "if-recent",
        label: "if-recent",
      }],
    },
    {
      key: "fallbackToCache",
      label: "Fall back to cache",
      type: "select",
      hint:
        "Whether to read the cached profile when a fresh fetch fails (vendor default on-error).",
      options: [{ value: "on-error", label: "on-error" }, { value: "never", label: "never" }],
    },
    {
      key: "liveFetch",
      label: "Live fetch",
      type: "select",
      hint: "force always fetches a fresh profile and costs 9 extra credits.",
      options: [{ value: "default", label: "default" }, { value: "force", label: "force" }],
    },
  ],
  output: [
    { key: "profile", type: "object", label: "Company profile (the full response body)" },
    { key: "name", type: "string", label: "Company name" },
  ],

  async execute(input, ctx) {
    const res = await new EnrichLayerClient(ctx).get("/company", {
      url: input.url,
      categories: input.categories,
      funding_data: input.fundingData,
      exit_data: input.exitData,
      acquisitions: input.acquisitions,
      extra: input.extra,
      use_cache: input.useCache,
      fallback_to_cache: input.fallbackToCache,
      live_fetch: input.liveFetch,
    });
    return {
      profile: res,
      name: (res as { name?: string }).name ?? null,
    };
  },
};

export default companyProfileGet;
