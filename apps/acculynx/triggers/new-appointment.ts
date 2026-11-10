import type { ActionDefinition } from "@w6w/types";
import appointmentList from "../actions/appointment-list.ts";
import { appointmentWindow, recordSnapshot } from "../lib/triggers.ts";

export default recordSnapshot({
  key: "new-appointment",
  title: "New Appointment",
  description:
    "The run gets each appointment that appears on the AccuLynx calendar you choose within the next 90 days.",
  action: appointmentList as unknown as ActionDefinition,
  params: [appointmentList.params![0]],
  input: (params) => ({ calendarId: params.calendarId, ...appointmentWindow() }),
  output: [{ key: "id", type: "string", label: "Appointment ID" }],
  sample: { id: "appointment-101", type: "InitialAppointment" },
});
