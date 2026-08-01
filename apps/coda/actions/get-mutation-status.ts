import type { ActionDefinition } from "@w6w/types";
import { CodaClient } from "../lib/client.ts";

interface Input {
  requestId: string;
}

interface MutationStatus {
  completed: boolean;
}

/**
 * GET /mutationStatus/{requestId}
 *
 * Coda's row writes are async: `upsert-rows` / `update-row` / `delete-row` /
 * `delete-rows` all queue the edit and hand back a `requestId` with HTTP 202
 * rather than the applied result. This polls that request so a workflow can
 * wait for a write to actually land before reading the row back.
 */
const getMutationStatus: ActionDefinition<Input, MutationStatus> = {
  key: "get-mutation-status",
  type: "read",
  resource: "mutation",
  title: "Get Mutation Status",
  description: "Check whether a queued write (from its `requestId`) has been applied.",
  params: [
    { key: "requestId", label: "Request ID", type: "string", required: true },
  ],
  output: [
    { key: "completed", type: "boolean", label: "Completed" },
  ],

  execute(input, ctx) {
    const client = new CodaClient(ctx);
    return client.request<MutationStatus>(`/mutationStatus/${input.requestId}`);
  },
};

export default getMutationStatus;
