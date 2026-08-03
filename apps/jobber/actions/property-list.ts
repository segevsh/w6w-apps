import type { ActionDefinition } from "@w6w/types";
import { JobberClient, optionalInput, PAGE_INFO, PROPERTY_FIELDS } from "../lib/client.ts";

interface Input {
  clientId?: string;
  searchTerm?: string;
  primaryOnly?: boolean;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListProperties(
    $filter: PropertiesFilterAttributes
    $searchTerm: String
    $first: Int
    $after: String
  ) {
    properties(filter: $filter, searchTerm: $searchTerm, first: $first, after: $after) {
      nodes { ${PROPERTY_FIELDS} client { id name } }
      ${PAGE_INFO}
    }
  }
`;

/**
 * Properties are the addresses work happens at, and they matter more than a
 * generic "list addresses" action would suggest: `quote-create` requires a
 * `propertyId`, not just a client, because one client can own several serviced
 * locations. This is the lookup that supplies it.
 */
const propertyList: ActionDefinition<Input> = {
  key: "property-list",
  type: "search",
  resource: "property",
  title: "List Properties",
  description:
    "List serviced properties, optionally narrowed to one client. The source of the `propertyId` that quotes and jobs require.",
  params: [
    {
      key: "clientId",
      label: "Client ID",
      type: "string",
      hint: "Restrict to one client's properties.",
    },
    {
      key: "searchTerm",
      label: "Search",
      type: "string",
      hint: "Free-text search over addresses.",
    },
    {
      key: "primaryOnly",
      label: "Primary only",
      type: "boolean",
      hint:
        "True returns only each client's primary property; false excludes it; omit for all of them.",
      advanced: true,
    },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 25,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{ key: "properties", type: "object", label: "Page of properties with pageInfo" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, {
      filter: optionalInput({ clientId: input.clientId, primary: input.primaryOnly }),
      searchTerm: input.searchTerm,
      first: input.first ?? 25,
      after: input.after,
    });
  },
};

export default propertyList;
