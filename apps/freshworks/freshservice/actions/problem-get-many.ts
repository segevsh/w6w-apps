import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const problemGetMany: ActionDefinition<Input> = {
  key: "problem-get-many",
  type: "search",
  resource: "problem",
  title: "List Problems",
  description:
    "List problem records. Without a workspace only the primary one is returned; pass 0 for every workspace.",
  params: [
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "problems", type: "array", label: "Problems" }],

  async execute(input, ctx) {
    const problems = await new FreshserviceClient(ctx).resource<unknown[]>(
      "problems",
      "/problems",
      { query: { workspace_id: input.workspaceId, page: input.page, per_page: input.perPage } },
    );
    return { problems };
  },
};

export default problemGetMany;
