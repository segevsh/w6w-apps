import type { ActionDefinition } from "@w6w/types";
import { ZoomClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  notifyHosts?: boolean;
  occurrenceId?: string;
}

const meetingDelete: ActionDefinition<Input> = {
  key: "meeting-delete",
  type: "perform",
  resource: "meeting",
  title: "Delete Meeting",
  description: "Cancel a meeting, or one occurrence of a recurring one.",
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    {
      key: "occurrenceId",
      label: "Occurrence ID",
      type: "string",
      hint: "Delete only this occurrence of a recurring meeting.",
    },
    { key: "notifyHosts", label: "Notify hosts", type: "boolean", default: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(`/meetings/${encodeURIComponent(input.meetingId)}`, {
      method: "DELETE",
      query: {
        occurrence_id: input.occurrenceId,
        schedule_for_reminder: input.notifyHosts,
      },
    });
  },
};

export default meetingDelete;
