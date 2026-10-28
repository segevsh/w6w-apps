import type { ActionDefinition } from "@w6w/types";
import {
  DEFAULT_PERSON_FIELDS,
  fieldOptions,
  GoogleContactsClient,
  PERSON_FIELDS,
  requiredFieldMask,
  stringList,
} from "../lib/client.ts";

interface Input {
  query: string;
  readMask?: string | string[];
  pageSize?: number;
  sources?: string | string[];
}

/**
 * `people.searchContacts` — plain-text search over the user's contacts.
 * GET /v1/people:searchContacts
 *
 * Note the mask here is `readMask`, **not** `personFields` — the search methods
 * use a different parameter name for the same idea, and sending `personFields`
 * is silently ignored, which reads as "the API returned nothing useful".
 *
 * Google's documented caveat, surfaced in the `query` hint rather than worked
 * around here: the index is warmed per-session, so a first search issued
 * immediately after connecting can come back empty. Google's advice is to send
 * a warm-up request with an empty query first — this action does not do that
 * implicitly, because a silent extra request is worse than a documented one.
 */
const searchContacts: ActionDefinition<Input> = {
  key: "search-contacts",
  type: "search",
  resource: "person",
  title: "Search Contacts",
  description:
    "Search the authenticated user's contacts by name, nickname, email, phone number or organization.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      required: true,
      hint:
        "Plain text. Google warms the search index per session — if a first search returns nothing, run it again.",
    },
    {
      key: "readMask",
      label: "Read Mask",
      type: "multiselect",
      required: true,
      default: DEFAULT_PERSON_FIELDS.split(","),
      options: fieldOptions(PERSON_FIELDS),
      hint: "Required by Google. This method calls the mask `readMask`, not `personFields`.",
    },
    {
      key: "pageSize",
      label: "Page Size",
      type: "number",
      default: 10,
      validation: { min: 1, max: 30, integer: true },
      hint: "1–30 (this method's ceiling is far lower than List Connections'). Defaults to 10.",
    },
    {
      key: "sources",
      label: "Sources",
      type: "multiselect",
      options: [
        { value: "READ_SOURCE_TYPE_CONTACT", label: "Contact" },
        { value: "READ_SOURCE_TYPE_PROFILE", label: "Profile" },
      ],
      hint: "Defaults to READ_SOURCE_TYPE_CONTACT.",
    },
  ],
  output: [
    { key: "results", type: "array", label: "Results (each with a `person`)" },
  ],

  execute(input, ctx) {
    const client = new GoogleContactsClient(ctx);
    return client.request("/people:searchContacts", {
      query: {
        query: input.query,
        readMask: requiredFieldMask(input.readMask),
        pageSize: input.pageSize,
        sources: stringList(input.sources),
      },
    });
  },
};

export default searchContacts;
