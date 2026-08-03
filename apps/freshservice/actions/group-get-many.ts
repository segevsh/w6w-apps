import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { pagination, workspaceId } from "../lib/params.ts";

interface Input {
  workspaceId?: number;
  page?: number;
  perPage?: number;
}

const groupGetMany: ActionDefinition<Input> = {
  key: "group-get-many",
  type: "read",
  resource: "group",
  title: "List Agent Groups",
  description:
    "List agent groups. Groups are per-workspace in Freshservice, so there is no all-workspaces listing — pass one workspace at a time.",
  params: [
    workspaceId,
    ...pagination,
  ],
  output: [{ key: "groups", type: "array", label: "Groups" }],

  async execute(input, ctx) {
    const groups = await new FreshserviceClient(ctx).resource<unknown[]>("groups", "/groups", {
      query: { workspace_id: input.workspaceId, page: input.page, per_page: input.perPage },
    });
    return { groups };
  },
};

export default groupGetMany;
