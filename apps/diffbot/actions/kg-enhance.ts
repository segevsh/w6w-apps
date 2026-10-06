import type { ActionDefinition } from "@w6w/types";
import { compact, DiffbotClient, KG_HOST } from "../lib/client.ts";

interface Input {
  type: string;
  name?: string;
  url?: string;
  id?: string;
  email?: string;
  phone?: string;
  location?: string;
  employer?: string;
  title?: string;
  school?: string;
  description?: string;
  ip?: string;
  customId?: string;
  size?: number;
  threshold?: number;
  refresh?: boolean;
  search?: boolean;
  filter?: string;
  filterExclude?: string;
  jsonmode?: string;
}

interface EnhanceResponse {
  version?: number;
  hits?: number;
  kgversion?: string;
  data?: Array<{ score?: number; esscore?: number; entity?: unknown; errors?: string[] }>;
  errors?: string[];
}

const personOnly = "Person only.";

/**
 * `GET https://kg.diffbot.com/kg/v3/enhance` — match partial data against the
 * Knowledge Graph and return the best entity. Credits are spent only when a match
 * is found: 25 per entity, 100 with `refresh` (docs.diffbot.com/docs/credits).
 */
const kgEnhance: ActionDefinition<Input> = {
  key: "kg-enhance",
  type: "read",
  resource: "entity",
  title: "Enhance Person or Organization",
  description: "Enrich a person or organization from partial data (name, website, email, …): " +
    "Diffbot scores candidates and returns the best Knowledge Graph match. 25 credits per " +
    "match, 100 with refresh; no match costs nothing.",
  params: [
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      default: "Organization",
      options: [
        { value: "Organization", label: "Organization" },
        { value: "Person", label: "Person" },
      ],
    },
    { key: "name", label: "Name", type: "string" },
    { key: "url", label: "Website / origin URL", type: "string" },
    { key: "id", label: "Diffbot ID", type: "string", hint: "Look up a known entity directly." },
    { key: "email", label: "Email", type: "string", hint: personOnly },
    { key: "phone", label: "Phone", type: "string" },
    { key: "location", label: "Location", type: "string" },
    { key: "employer", label: "Employer", type: "string", hint: personOnly },
    { key: "title", label: "Job title", type: "string", hint: personOnly },
    { key: "school", label: "School", type: "string", hint: personOnly },
    { key: "description", label: "Description", type: "string" },
    { key: "ip", label: "IP address", type: "string" },
    {
      key: "customId",
      label: "Custom ID",
      type: "string",
      hint: "Your own correlation ID, returned with the request.",
    },
    {
      key: "size",
      label: "Max matches",
      type: "number",
      hint: "Vendor default 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "threshold",
      label: "Similarity threshold",
      type: "number",
      hint: "Minimum Enhance score to accept a match.",
    },
    {
      key: "refresh",
      label: "Refresh",
      type: "boolean",
      hint: "Re-crawl the entity's sources first. 100 credits instead of 25.",
    },
    {
      key: "search",
      label: "Search the web",
      type: "boolean",
      hint: "Also search the web for origins and merge them with the Knowledge Graph record.",
    },
    {
      key: "filter",
      label: "Fields to keep",
      type: "string",
      hint: "Semicolon-separated paths, e.g. $.name;$.homepageUri;$.nbEmployees.",
    },
    { key: "filterExclude", label: "Fields to drop", type: "string" },
    {
      key: "jsonmode",
      label: "JSON mode",
      type: "select",
      options: [{ value: "extended", label: "extended — include origin information for facts" }],
    },
  ],
  output: [
    { key: "found", type: "boolean", label: "A match was returned" },
    { key: "hits", type: "number", label: "Matches returned" },
    { key: "score", type: "number", label: "Enhance score of the best match" },
    { key: "entity", type: "object", label: "Best matching entity (null when none)" },
    { key: "matches", type: "array", label: "All matches: score, esscore, entity" },
    { key: "kgVersion", type: "string", label: "Knowledge Graph version queried" },
    { key: "errors", type: "array", label: "Errors the vendor reported" },
  ],

  async execute(input, ctx) {
    const query = compact({
      type: input.type,
      name: input.name,
      url: input.url,
      id: input.id,
      email: input.email,
      phone: input.phone,
      location: input.location,
      employer: input.employer,
      title: input.title,
      school: input.school,
      description: input.description,
      ip: input.ip,
      customId: input.customId,
      size: input.size,
      threshold: input.threshold,
      refresh: input.refresh === true ? true : undefined,
      search: input.search === true ? true : undefined,
      filter: input.filter,
      filterExclude: input.filterExclude,
      jsonmode: input.jsonmode,
    }) as Record<string, string | number | boolean>;
    const { body } = await new DiffbotClient(ctx).request("/kg/v3/enhance", {
      host: KG_HOST,
      query,
    });
    const r = (body ?? {}) as EnhanceResponse;
    const matches = (Array.isArray(r.data) ? r.data : []).filter((m) => m.entity);
    return {
      found: matches.length > 0,
      hits: r.hits ?? matches.length,
      score: matches[0]?.score,
      entity: matches[0]?.entity ?? null,
      matches,
      kgVersion: r.kgversion,
      errors: r.errors ?? [],
    };
  },
};

export default kgEnhance;
