import type { ActionDefinition } from "@w6w/types";
import { RecallClient } from "../lib/client.ts";
import { CURSOR_OUTPUT, cursorParam } from "../lib/params.ts";

interface Input {
  calendarId: string;
  startTimeGte?: string;
  startTimeLte?: string;
  updatedAtGte?: string;
  icalUid?: string;
  isDeleted?: boolean;
  cursor?: string;
}

/** `GET /api/v2/calendar-events/` — cursor-paginated: `{ next, previous, results }`. */
const action: ActionDefinition<Input> = {
  key: "calendar-event-list",
  type: "search",
  resource: "calendar",
  title: "List Calendar Events",
  description: "List the events of one calendar, with the bots scheduled for each.",
  params: [
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      required: true,
      hint: "The calendar to list events from.",
    },
    { key: "startTimeGte", label: "Starts at or after", type: "datetime", hint: "ISO 8601." },
    { key: "startTimeLte", label: "Starts at or before", type: "datetime", hint: "ISO 8601." },
    { key: "updatedAtGte", label: "Updated at or after", type: "datetime", hint: "ISO 8601." },
    { key: "icalUid", label: "iCal UID", type: "string" },
    {
      key: "isDeleted",
      label: "Deleted events",
      type: "boolean",
      hint: "Set to include only deleted (true) or only live (false) events; leave unset for all.",
    },
    cursorParam,
  ],
  output: [{ key: "events", type: "array", label: "Items on this page" }, ...CURSOR_OUTPUT],

  async execute(input, ctx) {
    const { items, nextCursor } = await new RecallClient(ctx).list("/api/v2/calendar-events/", {
      query: {
        calendar_id: input.calendarId,
        start_time__gte: input.startTimeGte,
        start_time__lte: input.startTimeLte,
        updated_at__gte: input.updatedAtGte,
        ical_uid: input.icalUid,
        is_deleted: input.isDeleted,
        cursor: input.cursor,
      },
    });
    return { events: items, ...(nextCursor ? { nextCursor } : {}) };
  },
};

export default action;
