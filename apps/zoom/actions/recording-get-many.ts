import type { ActionDefinition } from "@w6w/types";
import { unset, ZoomClient } from "../lib/client.ts";

interface Input {
  userId?: string;
  from?: string;
  to?: string;
  pageSize?: number;
  nextPageToken?: string;
}

/**
 * Zoom's window for this endpoint is a month at most, and it defaults to the
 * last 30 days when `from`/`to` are omitted.
 */
const recordingGetMany: ActionDefinition<Input> = {
  key: "recording-get-many",
  type: "search",
  resource: "recording",
  title: "List Cloud Recordings",
  description:
    "List a user's cloud recordings. Zoom allows a window of at most one month, defaulting to the last 30 days.",
  params: [
    { key: "userId", label: "User", type: "string", default: "me" },
    { key: "from", label: "From", type: "date", row: "window", hint: "yyyy-mm-dd." },
    {
      key: "to",
      label: "To",
      type: "date",
      row: "window",
      hint: "yyyy-mm-dd, at most a month after From.",
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
    { key: "meetings", type: "array", label: "Meetings with recordings" },
    { key: "next_page_token", type: "string", label: "Token for the next page" },
    { key: "total_records", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const user = input.userId || "me";
    return new ZoomClient(ctx).request(`/users/${encodeURIComponent(user)}/recordings`, {
      query: {
        from: unset(input.from),
        to: unset(input.to),
        page_size: input.pageSize,
        next_page_token: unset(input.nextPageToken),
      },
    });
  },
};

export default recordingGetMany;
