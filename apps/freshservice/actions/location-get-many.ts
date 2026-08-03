import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const locationGetMany: ActionDefinition<Input> = {
  key: "location-get-many",
  type: "read",
  resource: "location",
  title: "List Locations",
  description: "List the cities, campuses, offices and rooms assets and users are filed under.",
  params: [
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "locations", type: "array", label: "Locations" }],

  async execute(input, ctx) {
    const locations = await new FreshserviceClient(ctx).resource<unknown[]>(
      "locations",
      "/locations",
      { query: { workspace_id: input.workspaceId, page: input.page, per_page: input.perPage } },
    );
    return { locations };
  },
};

export default locationGetMany;
