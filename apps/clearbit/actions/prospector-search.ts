import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, compact, PROSPECTOR_HOST } from "../lib/client.ts";

interface Input {
  domain: string;
  title?: string;
  seniority?: string;
  role?: string;
  city?: string;
  state?: string;
  country?: string;
  name?: string;
  page?: number;
  pageSize?: number;
}

/**
 * `GET prospector.clearbit.com/v1/people/search?domain=...` — the Prospector
 * API: given a company domain, returns people who work there, optionally
 * filtered by title/seniority/role/location. Each returned record's `id` can
 * be passed to `prospector-reveal-email` to reveal a verified email address.
 *
 * Params (including the plural `titles`/`seniorities`/`roles`/`cities`/
 * `states`/`countries` array variants this action does not expose, to keep
 * the form simple) confirmed against the official `clearbit-node` SDK
 * (`src/prospector.js`) and independently against its own test suite
 * (`test/prospector.js`), which pins the exact response shape: `{page,
 * page_size, total, results}`.
 */
const action: ActionDefinition<Input> = {
  key: "prospector-search",
  type: "search",
  resource: "prospect",
  title: "Search Prospects",
  description: "Find people at a company, optionally filtered by title, seniority or location.",
  params: [
    {
      key: "domain",
      label: "Company Domain",
      type: "string",
      required: true,
      placeholder: "example.com",
    },
    { key: "title", label: "Job Title", type: "string" },
    {
      key: "seniority",
      label: "Seniority",
      type: "select",
      options: [
        { value: "executive", label: "Executive" },
        { value: "director", label: "Director" },
        { value: "manager", label: "Manager" },
        { value: "senior", label: "Senior" },
        { value: "entry", label: "Entry" },
      ],
    },
    { key: "role", label: "Role", type: "string", hint: "e.g. engineering, sales, marketing." },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State", type: "string", advanced: true },
    { key: "country", label: "Country", type: "string", advanced: true },
    { key: "name", label: "Individual Name", type: "string", advanced: true },
    { key: "page", label: "Page", type: "number", advanced: true },
    { key: "pageSize", label: "Page Size", type: "number", advanced: true },
  ],
  output: [
    { key: "page", type: "number", label: "Page" },
    { key: "page_size", type: "number", label: "Page Size" },
    { key: "total", type: "number", label: "Total" },
    { key: "results", type: "array", label: "Prospects" },
  ],

  async execute(input, ctx) {
    const domain = (input.domain ?? "").trim();
    if (!domain) throw new Error("`domain` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(PROSPECTOR_HOST, "/v1/people/search", {
      query: compact({
        domain,
        title: input.title,
        seniority: input.seniority,
        role: input.role,
        city: input.city,
        state: input.state,
        country: input.country,
        name: input.name,
        page: input.page,
        page_size: input.pageSize,
      }),
    });
  },
};

export default action;
