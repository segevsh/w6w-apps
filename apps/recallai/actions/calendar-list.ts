import type { ActionDefinition } from "@w6w/types";
import { RecallClient, redactCalendar } from "../lib/client.ts";
import { CURSOR_OUTPUT, cursorParam } from "../lib/params.ts";

interface Input {
  createdAtGte?: string;
  email?: string;
  platform?: string;
  status?: string;
  cursor?: string;
}

/** `GET /api/v2/calendars/` — cursor-paginated: `{ next, previous, results }`. */
const action: ActionDefinition<Input> = {
  key: "calendar-list",
  type: "search",
  resource: "calendar",
  title: "List Calendars",
  description:
    "List connected calendars (Calendar V2). The OAuth refresh token and client secret Recall echoes back are removed from every item.",
  params: [
    { key: "createdAtGte", label: "Created at or after", type: "datetime", hint: "ISO 8601." },
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Only the calendar with this account email.",
    },
    {
      key: "platform",
      label: "Platform",
      type: "select",
      options: [{ value: "google_calendar", label: "google_calendar" }, {
        value: "microsoft_outlook",
        label: "microsoft_outlook",
      }],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "connected", label: "connected" }, {
        value: "connecting",
        label: "connecting",
      }, { value: "disconnected", label: "disconnected" }],
    },
    cursorParam,
  ],
  output: [{ key: "calendars", type: "array", label: "Items on this page" }, ...CURSOR_OUTPUT],

  async execute(input, ctx) {
    const { items, nextCursor } = await new RecallClient(ctx).list("/api/v2/calendars/", {
      query: {
        created_at__gte: input.createdAtGte,
        email: input.email,
        platform: input.platform,
        status: input.status,
        cursor: input.cursor,
      },
    });
    return { calendars: items.map(redactCalendar), ...(nextCursor ? { nextCursor } : {}) };
  },
};

export default action;
