import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { PAGED_OUTPUT, type PagingInput, pagingParams, pagingQuery } from "../lib/params.ts";

const researchList: ActionDefinition<PagingInput, Record<string, unknown>> = {
  key: "research-list",
  type: "read",
  resource: "research",
  title: "List Research Tasks",
  description: "List the organisation's research tasks, paginated.",
  params: pagingParams,
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    const body = await new LinkupClient(ctx).get<
      { data?: unknown[]; metadata?: unknown }
    >("/v1/research", pagingQuery(input));
    return { items: body?.data ?? [], metadata: body?.metadata };
  },
};

export default researchList;
