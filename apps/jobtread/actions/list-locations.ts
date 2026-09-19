import type { ActionDefinition } from "@w6w/types";
import { connectionArgs, JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  size?: number;
  page?: string;
  where?: unknown;
  sortBy?: unknown;
}

interface LocationNode {
  id: string;
  name: string;
  address: string;
  account: { id: string; name: string } | null;
}

interface OrganizationLocationsResponse {
  organization: {
    locations: { nodes: LocationNode[]; nextPage: string | null };
  } | null;
}

const listLocations: ActionDefinition<Input> = {
  key: "list-locations",
  type: "search",
  resource: "location",
  title: "List Locations",
  description:
    "List an organization's locations — job sites, tied to a customer account " +
    "(organization.locations). Fields confirmed live 2026-09-15.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "size", label: "Page Size", type: "number", default: 25 },
    { key: "page", label: "Page Cursor", type: "string", hint: "From a previous call's nextPage." },
    {
      key: "where",
      label: "Filter",
      type: "json",
      hint: 'Pave filter, e.g. `["name", "=", "Main St Renovation"]`.',
    },
    { key: "sortBy", label: "Sort", type: "json", hint: 'JSON array of `{"field": "name"}`.' },
  ],
  output: [
    { key: "nodes", type: "array", label: "Locations" },
    { key: "nextPage", type: "string", label: "Next Page Cursor" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<OrganizationLocationsResponse>({
      organization: {
        $: { id: input.organizationId },
        locations: {
          $: connectionArgs(input),
          nextPage: {},
          nodes: { id: {}, name: {}, address: {}, account: { id: {}, name: {} } },
        },
      },
    });
    if (!res.organization) throw new Error(`organization ${input.organizationId} not found`);
    return res.organization.locations;
  },
};

export default listLocations;
