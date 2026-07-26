import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  type?: string;
  pageSize?: number;
  nextPageToken?: string;
}

const meetingGetMany: ActionDefinition<Input> = {
  key: "meeting-get-many",
  type: "search",
  resource: "meeting",
  title: "List Meetings",
  description: "List a user's meetings. Follow `next_page_token` for further pages.",
  params: [
    {
      key: "userId",
      label: "User",
      type: "string",
      default: "me",
      hint: "`me`, a user id, or an email.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      default: "scheduled",
      options: [
        { value: "scheduled", label: "Scheduled" },
        { value: "live", label: "Live now" },
        { value: "upcoming", label: "Upcoming" },
        { value: "upcoming_meetings", label: "Upcoming (incl. recurring)" },
        { value: "previous_meetings", label: "Previous" },
      ],
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 30,
      row: "page",
      validation: { min: 1, max: 300, integer: true },
      hint: "Zoom caps this at 300.",
    },
    {
      key: "nextPageToken",
      label: "Page token",
      type: "string",
      row: "page",
      advanced: true,
      hint: "`next_page_token` from the previous page.",
    },
  ],
  output: [
    { key: "meetings", type: "array", label: "Meetings" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
    { key: "total_records", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const user = input.userId || "me";
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(user)}/meetings`, {
      query: {
        type: unset(input.type),
        page_size: input.pageSize,
        next_page_token: unset(input.nextPageToken),
      },
    });
  },
};

export default meetingGetMany;
