import type { ActionDefinition } from "@w6w/types";
import { LinkupClient } from "../lib/client.ts";
import { PAGED_OUTPUT, type PagingInput, pagingParams, pagingQuery } from "../lib/params.ts";

const extractList: ActionDefinition<PagingInput, Record<string, unknown>> = {
  key: "extract-list",
  type: "read",
  resource: "extract",
  title: "List Extract Tasks (Beta)",
  description: "List the organisation's Extract tasks, paginated.",
  params: pagingParams,
  output: [...PAGED_OUTPUT],

  async execute(input, ctx) {
    const body = await new LinkupClient(ctx).get<
      { data?: unknown[]; metadata?: unknown }
    >("/v1/extract", pagingQuery(input));
    return { items: body?.data ?? [], metadata: body?.metadata };
  },
};

export default extractList;
