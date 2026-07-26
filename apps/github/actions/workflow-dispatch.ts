import type { ActionDefinition } from "@w6w/types";
import { GitHubClient, repoPath } from "../lib/client.ts";
import { owner, repository } from "../lib/params.ts";

interface Input {
  owner: string;
  repository: string;
  workflowId: string;
  ref: string;
  inputs?: unknown;
}

/**
 * The workflow must declare `on: workflow_dispatch` — GitHub rejects the call
 * otherwise. It answers 204 with no body: the run is queued asynchronously, so
 * there is no run id to return here.
 */
const workflowDispatch: ActionDefinition<Input> = {
  key: "workflow-dispatch",
  type: "perform",
  resource: "workflow",
  title: "Dispatch Workflow",
  description:
    "Trigger a workflow_dispatch run. GitHub queues it asynchronously and returns no run id.",
  // Each dispatch queues another run.
  idempotent: false,
  params: [
    owner,
    repository,
    {
      key: "workflowId",
      label: "Workflow",
      type: "string",
      required: true,
      hint: "Numeric workflow id, or the file name (e.g. `ci.yml`).",
    },
    {
      key: "ref",
      label: "Ref",
      type: "string",
      required: true,
      hint: "Branch or tag to run against.",
    },
    {
      key: "inputs",
      label: "Inputs",
      type: "json",
      hint: 'Values for the workflow\'s declared inputs, e.g. { "environment": "staging" }.',
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new GitHubClient(ctx).request(
      `/repos/${repoPath(input.owner, input.repository)}/actions/workflows/${
        encodeURIComponent(input.workflowId)
      }/dispatches`,
      { method: "POST", body: { ref: input.ref, inputs: input.inputs } },
    );
  },
};

export default workflowDispatch;
