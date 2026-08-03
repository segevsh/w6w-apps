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
  emails?: string;
  phoneNumber?: string;
  statusIds?: number[] | null;
  assigneeIds?: number[] | null;
  customerSourceIds?: number[] | null;
  tags?: string[] | null;
  city?: string;
  state?: string;
  country?: string;
  includeConvertedLeads?: boolean;
  minimumCreatedDate?: number;
  maximumCreatedDate?: number;
  minimumModifiedDate?: number;
  maximumModifiedDate?: number;
}

/**
 * `POST /leads/search` — list and filter Leads.
 *
 * A Lead in Copper is the pre-qualification catch-all: it "contains information
 * about the contact, the company and the project in one" and is converted into a
 * Person + Company + Opportunity once qualified.
 *
 * Two Lead-specific details:
 *
 *   - `emails` here is a **string**, singular, unlike People's `emails` array. A
 *     Lead carries one email object, not a list, and the filter mirrors that.
 *     Getting this wrong is easy precisely because the field names match.
 *   - `include_converted_leads` defaults to `false`, so converted Leads are
 *     invisible unless you ask for them. That is usually what you want and
 *     occasionally exactly what you do not.
 *
 * `status_ids` are account-specific and read from `GET /lead_statuses` — unlike
 * Opportunity statuses, they are not a fixed 0–3.
 */
const searchLeads: ActionDefinition<Input> = {
  key: "search-leads",
  type: "search",
  resource: "lead",
  title: "Search Leads",
  description:
    "List and filter Leads via `POST /leads/search`. Converted Leads are excluded unless you set " +
    "Include converted leads.",
  params: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "emails",
      label: "Email",
      type: "string",
      hint: "A single address — a Lead holds one email, so this filter is a string, not an array.",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "Partial match for 6 digits or fewer, fuzzy for 7 or more.",
    },
    {
      key: "statusIds",
      label: "Status IDs",
      type: "json",
      hint:
        "JSON array. Lead statuses are account-specific — read the ids from `GET /lead_statuses` " +
        "rather than assuming the Opportunity 0–3 scheme.",
    },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "json",
      hint: "JSON array of User ids, or `[-2]` for Leads with no assignee.",
    },
    {
      key: "customerSourceIds",
      label: "Customer source IDs",
      type: "json",
      hint: "JSON array, or `[-2]` for no source. Read the ids from `GET /customer_sources`.",
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
      key: "includeConvertedLeads",
      label: "Include converted leads",
      type: "boolean",
      hint: "Copper defaults this to false, so already-converted Leads are hidden.",
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
    {
      key: "minimumModifiedDate",
      label: "Modified after",
      type: "number",
      hint: "Unix timestamp (seconds). The usual filter for an incremental sync.",
    },
    {
      key: "maximumModifiedDate",
      label: "Modified before",
      type: "number",
      hint: "Unix timestamp (seconds).",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search(
      "/leads/search",
      searchBody(input, {
        name: input.name,
        emails: input.emails,
        phone_number: input.phoneNumber,
        status_ids: input.statusIds ?? undefined,
        assignee_ids: input.assigneeIds ?? undefined,
        customer_source_ids: input.customerSourceIds ?? undefined,
        tags: input.tags ?? undefined,
        city: input.city,
        state: input.state,
        country: input.country,
        include_converted_leads: input.includeConvertedLeads,
        minimum_created_date: input.minimumCreatedDate,
        maximum_created_date: input.maximumCreatedDate,
        minimum_modified_date: input.minimumModifiedDate,
        maximum_modified_date: input.maximumModifiedDate,
      }),
    );
  },
};

export default searchLeads;
