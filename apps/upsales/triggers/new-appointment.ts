import appointmentList from "../actions/appointment-list.ts";
import { listTrigger } from "../lib/list-trigger.ts";
export default listTrigger({
  key: "new-appointment",
  title: "New Appointment",
  action: appointmentList,
  output: [{ key: "id", type: "number", label: "Appointment ID" }],
  sample: { id: 1, regDate: "2026-11-10T00:00:00Z" },
});
