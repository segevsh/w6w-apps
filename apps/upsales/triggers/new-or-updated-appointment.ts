import appointmentList from "../actions/appointment-list.ts";
import { updatedListTrigger } from "../lib/list-trigger.ts";
export default updatedListTrigger({
  key: "new-or-updated-appointment",
  title: "New or Updated Appointment",
  noun: "appointment",
  action: appointmentList,
  output: [
    { key: "id", type: "number", label: "Appointment ID" },
    { key: "modDate", type: "string", label: "Modified at" },
  ],
  sample: { id: 1, modDate: "2026-11-10T00:00:00Z" },
});
