import type { ActionDefinition } from "@w6w/types";
import { RecallClient, redactCalendar, seg } from "../lib/client.ts";
import { CALENDAR_OUTPUT, idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /api/v2/calendars/{id}/`. */
const action: ActionDefinition<Input> = {
  key: "calendar-get",
  type: "read",
  resource: "calendar",
  title: "Get Calendar",
  description:
    "Retrieve a connected calendar (Calendar V2). The OAuth refresh token and client secret Recall echoes back are removed.",
  params: [idParam("Calendar ID")],
  output: CALENDAR_OUTPUT,

  async execute(input, ctx) {
    const cal = await new RecallClient(ctx).request<Record<string, unknown>>(
      "GET",
      `/api/v2/calendars/${seg(input.id)}/`,
    );
    return redactCalendar(cal);
  },
};

export default action;
