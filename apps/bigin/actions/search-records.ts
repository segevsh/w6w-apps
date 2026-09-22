import type { ActionDefinition } from "@w6w/types";
import { type SearchInput, searchRecords } from "../lib/records.ts";
import { listOutput } from "../lib/params.ts";

interface Input extends SearchInput {
  module: string;
}

/**
 * `GET /{module}/search` works the same way for every module — Contacts,
 * Accounts, Pipelines, Tasks, Products, Calls, Events, Notes, or a custom one —
 * so this single action covers all of them instead of a `*-search` file per
 * resource.
 *
 * The four selectors are alternatives, not combinable: Bigin documents one URL
 * per selector (`criteria=`, `email=`, `phone=`, `word=`) and no `page` /
 * `per_page`, so exactly one is required and nothing else is sent. It also
 * needs a second scope — `ZohoSearch.securesearch.READ` — *in addition to* the
 * module scope, which is why the app's OAuth scopes list both.
 */
const searchRecordsAction: ActionDefinition<Input> = {
  key: "search-records",
  type: "search",
  resource: "query",
  title: "Search Records",
  description:
    "Search any module's records by criteria, email, phone or a free-text word. Exactly one of those four is required.",
  params: [
    {
      key: "module",
      label: "Module",
      type: "string",
      required: true,
      placeholder: "Pipelines",
      hint:
        "API name of the module: `Contacts`, `Accounts` (Companies), `Pipelines`, `Tasks`, or a custom one.",
    },
    {
      key: "criteria",
      label: "Criteria",
      placeholder: "((Deal_Name:starts_with:W)and(Amount:greater_than:5000))",
      type: "string",
      hint:
        "Bigin's criteria grammar: `({field_api_name}:{comparator}:{value})`, combined with `and`/`or`. Comparators include `equals`, `not_equal`, `starts_with`, `in`, `greater_than`, `less_than`, `between`.",
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Searches every email field of the module.",
    },
    {
      key: "phone",
      label: "Phone",
      type: "string",
      hint: "Searches every phone field of the module.",
    },
    { key: "word", label: "Word", type: "string", hint: "Free-text search across the module." },
  ],
  output: listOutput,

  execute(input, ctx) {
    return searchRecords(ctx, input);
  },
};

export default searchRecordsAction;
