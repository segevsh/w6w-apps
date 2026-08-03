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
  emails?: string[] | null;
  phoneNumber?: string;
  assigneeIds?: number[] | null;
  companyIds?: number[] | null;
  contactTypeIds?: number[] | null;
  tags?: string[] | null;
  city?: string;
  state?: string;
  country?: string;
  minimumCreatedDate?: number;
  maximumCreatedDate?: number;
}

/**
 * `POST /people/search` — list and filter People.
 *
 * **This is a POST, and there is no `GET /people`.** Copper reads every
 * collection through a `/search` sub-resource whose filters, sorting and paging
 * all live in a JSON request body. Reaching for a GET with a query string here
 * is the single most common way to get Copper wrong.
 *
 * Filters are ANDed: "When multiple criteria are provided, records meeting ALL
 * criteria will be returned". A handful of fields can also be filtered on
 * emptiness — Copper documents `city`, `state`, `postal_code`, `tags` and custom
 * dropdown/multi-select for People — and id-shaped filters accept the sentinel
 * `-2` to mean "no value", e.g. `assigneeIds: [-2]` for unowned People.
 *
 * The response body is a bare array; the count arrives as the `X-PW-TOTAL`
 * header and is surfaced as `total`. It is an upper bound, not an exact count.
 */
const searchPeople: ActionDefinition<Input> = {
  key: "search-people",
  type: "search",
  resource: "person",
  title: "Search People",
  description:
    "List and filter People. Copper has no GET collection endpoint — this is `POST /people/search` " +
    "with the filters, sorting and paging in the request body.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Full name to search for." },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: 'JSON array of email addresses, e.g. `["jim@example.com"]`.',
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint:
        "Matched partially for inputs of 6 digits or fewer, and fuzzily for 7 or more — Copper " +
        "strips non-numeric characters first and fuzzy matching also returns near misses.",
    },
    {
      key: "assigneeIds",
      label: "Assignee IDs",
      type: "json",
      hint:
        "JSON array of User ids the People must be owned by, or `[-2]` for People with no owner.",
    },
    {
      key: "companyIds",
      label: "Company IDs",
      type: "json",
      hint: "JSON array of Company ids, or `[-2]` for People with no company.",
    },
    {
      key: "contactTypeIds",
      label: "Contact type IDs",
      type: "json",
      hint: "JSON array of contact type ids. Read them from `GET /contact_types`.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      hint: "JSON array of tags; a Person matching at least one is returned.",
    },
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
      hint: "Unix timestamp (seconds) of the earliest creation date.",
    },
    {
      key: "maximumCreatedDate",
      label: "Created before",
      type: "number",
      hint: "Unix timestamp (seconds) of the latest creation date.",
    },
    ...SEARCH_PARAMS,
  ],
  output: SEARCH_OUTPUT,

  execute(input, ctx): Promise<SearchResult> {
    return new CopperClient(ctx).search(
      "/people/search",
      searchBody(input, {
        name: input.name,
        emails: input.emails ?? undefined,
        phone_number: input.phoneNumber,
        assignee_ids: input.assigneeIds ?? undefined,
        company_ids: input.companyIds ?? undefined,
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

export default searchPeople;
