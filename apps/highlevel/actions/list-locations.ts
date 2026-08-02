import type { ActionDefinition } from "@w6w/types";
import { HighLevelClient } from "../lib/client.ts";

interface Input {
  companyId?: string;
  skip?: number;
  limit?: number;
  email?: string;
}

const listLocations: ActionDefinition<Input> = {
  key: "list-locations",
  type: "read",
  resource: "location",
  title: "List Locations",
  description:
    "List sub-accounts (locations) visible to this credential. Only returns results for an " +
    "Agency-level install — a Location-level install (the one this app's Auth supports) is " +
    "already scoped to a single location and gets an empty/forbidden response here.",
  params: [
    { key: "companyId", label: "Agency (company) ID", type: "string" },
    { key: "email", label: "Filter by email", type: "string" },
    { key: "skip", label: "Skip", type: "number", default: 0 },
    { key: "limit", label: "Limit", type: "number", default: 10 },
  ],
  output: [{ key: "locations", type: "array", label: "Locations" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/locations/search", {
      query: {
        companyId: input.companyId,
        email: input.email,
        skip: input.skip ?? 0,
        limit: input.limit ?? 10,
      },
    });
  },
};

export default listLocations;
