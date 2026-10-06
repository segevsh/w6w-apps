import type { ActionDefinition } from "@w6w/types";
import { FormsparkClient, seg } from "../lib/client.ts";
import {
  limitParam,
  pageOutput,
  searchParam,
  startingAfterParam,
  workspaceIdParam,
} from "../lib/params.ts";

interface Input {
  workspaceId: string;
  limit?: number;
  startingAfter?: string;
  search?: string;
}

/** `GET /workspaces/{workspaceId}/submissions` — submissions across every form in a workspace. */
const workspaceSubmissionList: ActionDefinition<Input> = {
  key: "workspace-submission-list",
  type: "search",
  resource: "submission",
  title: "List Workspace Submissions",
  description: "List submissions across all forms in a workspace, optionally filtered by search " +
    "text. Requires submissions:read on an upgraded workspace.",
  params: [workspaceIdParam(), limitParam, startingAfterParam, searchParam],
  output: pageOutput,

  execute(input, ctx) {
    return new FormsparkClient(ctx).get(
      `/workspaces/${seg(input.workspaceId, "workspaceId")}/submissions`,
      { limit: input.limit, startingAfter: input.startingAfter, search: input.search },
    );
  },
};

export default workspaceSubmissionList;
