import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";
import { projectIdParam, runIdParam } from "../lib/params.ts";

/**
 * `DELETE /v1/projects/{projectId}/runs/{runId}` — cancel a run.
 *
 * Answers 204 with no body, so this action reports `{ cancelled: true }` itself.
 * Cancelling a run that has already finished is refused by Hex (422), so a retry
 * after success can fail; it is marked non-idempotent for that reason.
 */
interface Input {
  projectId: string;
  runId: string;
}

const runCancel: ActionDefinition<Input> = {
  key: "run-cancel",
  type: "perform",
  resource: "run",
  title: "Cancel Run",
  description: "Cancel a project run that is pending or running.",
  idempotent: false,
  params: [projectIdParam, runIdParam],
  output: [
    { key: "cancelled", type: "boolean", label: "True when Hex accepted the cancellation" },
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "runId", type: "string", label: "Run ID" },
  ],

  async execute(input, ctx) {
    await new HexClient(ctx).json(
      `/projects/${encodeId(input.projectId)}/runs/${encodeId(input.runId)}`,
      { method: "DELETE" },
    );
    return { cancelled: true, projectId: input.projectId, runId: input.runId };
  },
};

export default runCancel;
