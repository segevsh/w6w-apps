import type { ActionDefinition } from "@w6w/types";
import { CALENDAR_API_VERSION, HighLevelClient } from "../lib/client.ts";

interface Input {
  groupId?: string;
  showDrafted?: boolean;
}

const listCalendars: ActionDefinition<Input> = {
  key: "list-calendars",
  type: "read",
  resource: "calendar",
  title: "List Calendars",
  description: "List the booking calendars configured on the connected location.",
  params: [
    { key: "groupId", label: "Calendar group ID", type: "string" },
    { key: "showDrafted", label: "Include drafted calendars", type: "boolean", default: true },
  ],
  output: [{ key: "calendars", type: "array", label: "Calendars" }],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/calendars/", {
      version: CALENDAR_API_VERSION,
      query: {
        locationId: client.locationId,
        groupId: input.groupId,
        showDrafted: input.showDrafted,
      },
    });
  },
};

export default listCalendars;
