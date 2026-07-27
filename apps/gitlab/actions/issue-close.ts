import type { ActionDefinition } from "@w6w/types";
import { GitLabClient, projectPath } from "../lib/client.ts";
import { issueOutput, projectId } from "../lib/params.ts";

interface Input {
  projectId: string;
  issueIid: number;
}

/**
 * Closes an issue — `PUT /issues/{iid}` with `state_event=close`. Idempotent:
 * closing an already-closed issue is accepted and leaves it closed.
 */
const issueClose: ActionDefinition<Input> = {
  key: "issue-close",
  type: "perform",
  resource: "issue",
  title: "Close Issue",
  description: "Close an issue by its project-scoped IID.",
  idempotent: true,
  params: [
    projectId,
    { key: "issueIid", label: "Issue IID", type: "number", required: true },
  ],
  output: issueOutput,

  execute(input, ctx) {
    return new GitLabClient(ctx).request(
      `/projects/${projectPath(input.projectId)}/issues/${input.issueIid}`,
      { method: "PUT", body: { state_event: "close" } },
    );
  },
};

export default issueClose;
