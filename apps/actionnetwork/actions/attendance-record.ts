import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import {
  AUTORESPONSE_PARAM,
  BACKGROUND_PARAM,
  helperBody,
  PERSON_PARAMS,
  recordOutput,
  REFERRER_PARAMS,
  TAG_OP_PARAMS,
} from "../lib/person.ts";

/** Record Attendance Helper: `POST /events/{id}/attendances` with an inline person. */
const attendanceRecord: ActionDefinition<Input> = {
  key: "attendance-record",
  type: "perform",
  resource: "attendance",
  title: "Record RSVP",
  description:
    "Record that a person RSVPed to an event, creating or updating the person in the same call. A person RSVPs once; recording again replaces the earlier RSVP.",
  idempotent: true,
  params: [
    idParam("eventId", "Event ID"),
    ...PERSON_PARAMS,
    ...TAG_OP_PARAMS,
    ...REFERRER_PARAMS,
    AUTORESPONSE_PARAM,
    BACKGROUND_PARAM,
  ],
  output: recordOutput({ key: "status", type: "string", label: "RSVP status" }),

  execute(input, ctx) {
    return new ActionNetworkClient(ctx).create(
      `/events/${seg(need(input, "eventId"))}/attendances`,
      helperBody(input, {}, { autoresponse: true }),
      input.backgroundRequest === true,
    );
  },
};

export default attendanceRecord;
