import type { ActionDefinition } from "@w6w/types";
import { compact, DemioClient } from "../lib/client.ts";

interface Input {
  dateId: number;
  status?: string;
}

const participantsList: ActionDefinition<Input> = {
  key: "participants-list",
  type: "search",
  resource: "participant",
  title: "List Session Participants",
  description: "List a session's participants with their attendance status and registration " +
    "field values.",
  params: [
    { key: "dateId", label: "Session (date) ID", type: "number", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Attended", value: "attended" },
        { label: "Did not attend", value: "did not attend" },
        { label: "Completed", value: "completed" },
        { label: "Left early", value: "left early" },
        { label: "Banned", value: "banned" },
      ],
    },
  ],
  output: [{ key: "participants", type: "array", label: "Participants" }],

  async execute(input, ctx) {
    const res = await new DemioClient(ctx).request<{ participants?: unknown[] }>(
      `/report/${encodeURIComponent(String(input.dateId))}/participants`,
      { query: compact({ status: input.status }) },
    );
    return { participants: res?.participants ?? [] };
  },
};

export default participantsList;
