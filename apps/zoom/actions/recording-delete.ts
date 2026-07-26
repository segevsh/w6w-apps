import type { ActionDefinition } from "@w6w/types";
import { ZoomClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  action?: string;
}

const recordingDelete: ActionDefinition<Input> = {
  key: "recording-delete",
  type: "perform",
  resource: "recording",
  title: "Delete Meeting Recordings",
  description: "Move a meeting's cloud recordings to trash, or delete them permanently.",
  idempotent: true,
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    {
      key: "action",
      label: "Action",
      type: "select",
      default: "trash",
      options: [
        { value: "trash", label: "Move to trash (recoverable for 30 days)" },
        { value: "delete", label: "Delete permanently" },
      ],
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(
      `/meetings/${encodeURIComponent(input.meetingId)}/recordings`,
      { method: "DELETE", query: { action: input.action ?? "trash" } },
    );
  },
};

export default recordingDelete;
