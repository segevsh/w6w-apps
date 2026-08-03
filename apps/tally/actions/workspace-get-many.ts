import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, TallyClient } from "../lib/client.ts";
import { listOutput, type PageInput, pageParam } from "../lib/params.ts";

/**
 * GET /workspaces — every workspace the key's user can see.
 *
 * `page` is the only documented query param here; unlike `/forms` this endpoint
 * publishes no `limit`, so none is offered.
 */
const workspaceGetMany: ActionDefinition<PageInput, Record<string, unknown>> = {
  key: "workspace-get-many",
  type: "search",
  resource: "workspace",
  title: "Get Many Workspaces",
  description: "List the workspaces on this account, with their members, invites and folders.",
  params: [pageParam],
  output: listOutput,

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<ListEnvelope>("/workspaces", {
      query: { page: input.page },
    });
    return {
      items: body?.items ?? [],
      page: body?.page,
      limit: body?.limit,
      total: body?.total,
      hasMore: body?.hasMore,
    };
  },
};

export default workspaceGetMany;
