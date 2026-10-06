import type { ActionDefinition } from "@w6w/types";
import { RecallClient, seg } from "../lib/client.ts";
import { CALENDAR_EVENT_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v2/calendar-events/{id}/bot/` — answers the updated calendar event (200). */
const calendarEventUnscheduleBot: ActionDefinition<Input> = {
  key: "calendar-event-unschedule-bot",
  type: "perform",
  resource: "calendar",
  title: "Unschedule Bot for Calendar Event",
  description: "Remove the bot scheduled for a calendar event so it does not join.",
  idempotent: true,
  params: [idParam("Calendar event ID")],
  output: CALENDAR_EVENT_OUTPUT,

  execute(input, ctx) {
    return new RecallClient(ctx).request("DELETE", `/api/v2/calendar-events/${seg(input.id)}/bot/`);
  },
};

export default calendarEventUnscheduleBot;
