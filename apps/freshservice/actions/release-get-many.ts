import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const releaseGetMany: ActionDefinition<Input> = {
  key: "release-get-many",
  type: "search",
  resource: "release",
  title: "List Releases",
  description:
    "List release records. Without a workspace only the primary one is returned; pass 0 for every workspace.",
  params: [
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "releases", type: "array", label: "Releases" }],

  async execute(input, ctx) {
    const releases = await new FreshserviceClient(ctx).resource<unknown[]>(
      "releases",
      "/releases",
      { query: { workspace_id: input.workspaceId, page: input.page, per_page: input.perPage } },
    );
    return { releases };
  },
};

export default releaseGetMany;
