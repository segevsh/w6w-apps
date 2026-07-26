import type { ActionDefinition } from "@w6w/types";
import { SalesforceClient } from "../lib/client.ts";

/**
 * SOSL is the text-search counterpart to SOQL: one query across several
 * objects, matched against indexed text rather than field predicates.
 */
const search: ActionDefinition<{ sosl: string }> = {
  key: "search",
  type: "search",
  resource: "query",
  title: "Search (SOSL)",
  description: "Run a SOSL text search across multiple objects at once.",
  params: [
    {
      key: "sosl",
      label: "SOSL",
      type: "text",
      required: true,
      config: { multiline: true },
      placeholder: "FIND {acme} IN ALL FIELDS RETURNING Account(Id, Name), Contact(Id, Email)",
      hint: "SOSL syntax. Unlike SOQL this searches indexed text across objects.",
    },
  ],
  output: [{ key: "searchRecords", type: "array", label: "Matching records" }],

  execute(input, ctx) {
    return new SalesforceClient(ctx).request("/search", { query: { q: input.sosl } });
  },
};

export default search;
