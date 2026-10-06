import type { ActionDefinition } from "@w6w/types";
import { asObject, CertifierClient, compact } from "../lib/client.ts";
import { cursorParam, limitParam } from "../lib/params.ts";

interface Input {
  filter?: unknown;
  sortProperty?: string;
  sortOrder?: string;
  cursor?: string;
  limit?: number;
}

const credentialSearch: ActionDefinition<Input> = {
  key: "credential-search",
  type: "search",
  resource: "credential",
  title: "Search Credentials",
  description:
    "Find credentials with a structured filter (AND / OR / NOT over status, recipient, group, " +
    "dates) and sort, one page at a time.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "json",
      hint: 'Certifier filter object, e.g. {"AND":[{"status":{"equals":"issued"}},' +
        '{"recipient":{"email":{"endsWith":"@acme.com"}}}]}. Empty returns everything.',
    },
    {
      key: "sortProperty",
      label: "Sort by",
      type: "select",
      options: ["id", "createdAt", "updatedAt", "issueDate", "expiryDate"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [{ value: "desc", label: "Descending" }, { value: "asc", label: "Ascending" }],
    },
    cursorParam,
    limitParam,
  ],
  output: [
    { key: "data", type: "array", label: "Credentials" },
    { key: "pagination", type: "object", label: "Cursors (prev, next)" },
  ],

  execute(input, ctx) {
    if (input.sortOrder && !input.sortProperty) {
      throw new Error("sortOrder needs sortProperty");
    }
    const body = compact({
      filter: asObject(input.filter, "filter"),
      // The API requires both `property` and `order` once `sort` is present.
      sort: input.sortProperty
        ? { property: input.sortProperty, order: input.sortOrder || "desc" }
        : undefined,
      cursor: input.cursor,
      limit: input.limit,
    });
    return new CertifierClient(ctx).json("/credentials/search", { method: "POST", body });
  },
};

export default credentialSearch;
