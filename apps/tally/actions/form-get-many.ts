import type { ActionDefinition } from "@w6w/types";
import { type ListEnvelope, TallyClient } from "../lib/client.ts";
import { limitParam, listOutput, type PageLimitInput, pageParam } from "../lib/params.ts";

interface Input extends PageLimitInput {
  workspaceIds?: string[];
}

/**
 * GET /forms — every form the key's user can see, newest envelope fields
 * included (`numberOfSubmissions`, `isClosed`, `status`).
 *
 * `workspaceIds` is an `array` param in the OpenAPI, so it is sent as repeated
 * `workspaceIds=` pairs rather than a comma-joined string.
 */
const formGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "form-get-many",
  type: "search",
  resource: "form",
  title: "Get Many Forms",
  description: "List forms, optionally narrowed to one or more workspaces.",
  params: [
    pageParam,
    limitParam(500),
    {
      key: "workspaceIds",
      label: "Workspace IDs",
      type: "multiselect",
      hint: "Optional. Restrict results to these workspaces. Get IDs from Get Many Workspaces.",
    },
  ],
  output: listOutput,

  async execute(input, ctx) {
    const body = await new TallyClient(ctx).request<ListEnvelope>("/forms", {
      query: {
        page: input.page,
        limit: input.limit,
        workspaceIds: input.workspaceIds,
      },
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

export default formGetMany;
