import appointmentList from "../actions/appointment-list.ts";
import { feedTrigger } from "../lib/triggers.ts";

/** The run gets each appointment that is new or changed, most recently changed first (`GET /v4/appointments?order=desc`; an edit is a new event). Brief 9.1 (a), 9.2. */
export default feedTrigger({
  key: "new-or-updated-appointment",
  title: "New or Updated Appointment",
  description:
    "The run gets each appointment that is new or changed, most recently changed first (`GET /v4/appointments?order=desc`; an edit is a new event).",
  action: appointmentList,
  input: { order: "desc" },
  stamp: "updatedAt",
  output: [
    { key: "uid", type: "string", label: "UID" },
    { key: "title", type: "string", label: "Title" },
    { key: "startAt", type: "string", label: "Starts at" },
    { key: "status", type: "string", label: "Status" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    uid: "appointment_1",
    title: "Consultation",
    startAt: "2026-11-12T15:00:00.000Z",
    status: "scheduled",
    updatedAt: "2026-11-10T12:00:00.000Z",
  },
});
