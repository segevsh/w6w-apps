import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { BACKGROUND_PARAM, recordOutput } from "../lib/person.ts";

/** `PUT /events/{id}/attendances/{attendanceId}` — only accepted and attended are system statuses. */
const attendanceUpdate: ActionDefinition<Input> = {
  key: "attendance-update",
  type: "perform",
  resource: "attendance",
  title: "Update RSVP Status",
  description: "Mark an RSVP as accepted or attended (check-in).",
  idempotent: true,
  params: [
    idParam("eventId", "Event ID"),
    idParam("attendanceId", "Attendance ID"),
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [{ value: "accepted", label: "Accepted" }, { value: "attended", label: "Attended" }],
      hint: "The vendor documents only accepted and attended as settable.",
    },
    BACKGROUND_PARAM,
  ],
  output: recordOutput({ key: "status", type: "string", label: "RSVP status" }),

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).update(
      `/events/${seg(need(input, "eventId"))}/attendances/${seg(need(input, "attendanceId"))}`,
      { status: need(input, "status") },
      input.backgroundRequest === true,
    );
  },
};

export default attendanceUpdate;
