import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, need } from "../lib/client.ts";
import { limitParam, pageOutput, startingAfterParam, workspaceIdParam } from "../lib/params.ts";

interface Input {
  workspaceId: string;
  limit?: number;
  startingAfter?: string;
}

/**
 * `GET /forms?workspaceId=` — a workspace's forms. `workspaceId` is required by the spec. The
 * workspace must be upgraded or Formspark answers `403 upgrade_required`.
 */
const formList: ActionDefinition<Input> = {
  key: "form-list",
  type: "search",
  resource: "form",
  title: "List Forms",
  description: "List the forms in a workspace. Requires an upgraded workspace and forms:read.",
  params: [workspaceIdParam(), limitParam, startingAfterParam],
  output: pageOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get("/forms", {
      workspaceId: need(input.workspaceId, "workspaceId"),
      limit: input.limit,
      startingAfter: input.startingAfter,
    });
  },
};

export default formList;
