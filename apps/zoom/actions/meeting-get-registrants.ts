import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  meetingId: string;
  status?: string;
  pageSize?: number;
  nextPageToken?: string;
}

const meetingGetRegistrants: ActionDefinition<Input> = {
  key: "meeting-get-registrants",
  type: "search",
  resource: "meetingRegistrant",
  title: "List Meeting Registrants",
  description: "List who has registered for a meeting.",
  params: [
    { key: "meetingId", label: "Meeting ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "approved",
      options: [
        { value: "pending", label: "Pending" },
        { value: "approved", label: "Approved" },
        { value: "denied", label: "Denied" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      row: "page",
      validation: { min: 1, max: 300, integer: true },
    },
    { key: "nextPageToken", label: "Page token", type: "string", row: "page", advanced: true },
  ],
  output: [
    { key: "registrants", type: "array", label: "Registrants" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
  ],

  execute(input, ctx) {
    return new ZoomClient(ctx).request(
      `/meetings/${encodeURIComponent(input.meetingId)}/registrants`,
      {
        query: {
          status: unset(input.status),
          page_size: input.pageSize,
          next_page_token: unset(input.nextPageToken),
        },
      },
    );
  },
};

export default meetingGetRegistrants;
