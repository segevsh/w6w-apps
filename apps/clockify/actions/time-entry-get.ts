import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  timeEntryId: string;
}

/** GET /workspaces/{workspaceId}/time-entries/{timeEntryId}. Verified against n8n's `Clockify.node.ts`. */
const timeEntryGet: ActionDefinition<Input> = {
  key: "time-entry-get",
  type: "read",
  resource: "time-entry",
  title: "Get Time Entry",
  description: "Get a single time entry by ID.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "timeEntryId", label: "Time Entry ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Time Entry ID" },
  ],

  execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    return client.request(`/workspaces/${input.workspaceId}/time-entries/${input.timeEntryId}`);
  },
};

export default timeEntryGet;
