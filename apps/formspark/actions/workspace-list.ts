import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient } from "../lib/client.ts";
import { limitParam, pageOutput, startingAfterParam } from "../lib/params.ts";

interface Input {
  limit?: number;
  startingAfter?: string;
}

/**
 * `GET /workspaces` — every workspace the token's account belongs to. Open on any plan, which
 * makes it the way to discover which workspace is upgraded (`plan` other than `FREE`).
 */
const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description: "List the workspaces this token can reach, with plan and submissions quota. " +
    "Workspaces on the FREE plan cannot use the forms and submissions API.",
  params: [limitParam, startingAfterParam],
  output: pageOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get("/workspaces", {
      limit: input.limit,
      startingAfter: input.startingAfter,
    });
  },
};

export default workspaceList;
