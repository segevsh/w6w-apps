import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { CALENDAR_EVENT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /api/v2/calendar-events/{id}/`. */
const action: ActionDefinition<Input> = {
  key: "calendar-event-get",
  type: "read",
  resource: "calendar",
  title: "Get Calendar Event",
  description: "Retrieve a calendar event, including the bots scheduled for it.",
  params: [idParam("Calendar event ID")],
  output: CALENDAR_EVENT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("GET", `/api/v2/calendar-events/${seg(input.id)}/`);
  },
};

export default action;
