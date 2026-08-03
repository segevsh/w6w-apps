import type { ActionDefinition } from "@w6w/types";
import {
  CopperClient,
  SEARCH_OUTPUT,
  SEARCH_PARAMS,
  searchBody,
  type SearchInput,
  type SearchResult,
} from "../lib/client.ts";

interface Input extends SearchInput {
  name?: string;
  emailDomains?: string[] | null;
  phoneNumber?: string;
  assigneeIds?: number[] | null;
  contactTypeIds?: number[] | null;
  tags?: string[] | null;
  city?: string;
  state?: string;
  country?: string;
  minimumCreatedDate?: number;
  maximumCreatedDate?: number;
}

/**
 * `POST /companies/search` — list and filter Companies.
 *
 * A POST, like every Copper collection read. Filters are ANDed, and `-2` is the
 * "no value" sentinel for id-shaped filters (`assigneeIds: [-2]` finds unowned
 * Companies).
 *
 * `sort_by` defaults to `date_modified` here rather than `name` — Copper varies
 * the default per resource, which is a good reason to set it explicitly whenever
 * page order matters.
 */
const searchCompanies: ActionDefinition<Input> = {
  key: "search-companies",
  type: "search",
  resource: "company",
  title: "Search Companies",
  description:
    "List and filter Companies via `POST /companies/search` — Copper has no GET collection " +
    "endpoint; filters, sorting and paging go in the request body.",
  params: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "emailDomains",
      label: "Email domains",
      type: "json",
      hint: 'JSON array of domains, e.g. `["example.com"]`. A domain is unique across Companies.',
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "Partial match for 6 digits or fewer, fuzzy for 7 or more.",
    },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "json",
      hint: "JSON array of User ids, or `[-2]` for Companies with no owner.",
    },
    {
      key: "contactTypeIds",
      label: "Contact type IDs",
      type: "json",
      hint: "JSON array of contact type ids. Read them from `GET /contact_types`.",
    },
    { key: "tags", label: "Tags", type: "json", hint: "JSON array; matches at least one." },
    { key: "city", label: "City", type: "string" },
    { key: "state", label: "State or province", type: "string" },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "Two-character country code.",
      validation: { minLength: 2, maxLength: 2 },
    },
    {
      key: "minimumCreatedDate",
      label: "Created after",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    {
      key: "maximumCreatedDate",
      label: "Created before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search(
      "/companies/search",
      searchBody(input, {
        name: input.name,
        email_domains: input.emailDomains ?? undefined,
        phone_number: input.phoneNumber,
        assignee_ids: input.assigneeIds ?? undefined,
        contact_type_ids: input.contactTypeIds ?? undefined,
        tags: input.tags ?? undefined,
        city: input.city,
        state: input.state,
        country: input.country,
        minimum_created_date: input.minimumCreatedDate,
        maximum_created_date: input.maximumCreatedDate,
      }),
    );
  },
};

export default searchCompanies;
