import interviewScheduleList from "../actions/interview-schedule-list.ts";
import { sinceTrigger, stamp } from "../lib/triggers.ts";

/** Emits each interview schedule created since the previous successful check (`interviewSchedule.list` with `createdAfter`). Brief 9.1 (b), 9.8, 9.9. */
export default sinceTrigger({
  key: "new-interview-schedule",
  title: "New Interview Schedule",
  description:
    "Emits each interview schedule created since the previous successful check (`interviewSchedule.list` with `createdAfter`).",
  action: interviewScheduleList,
  list: "schedules",
  tsOf: stamp("createdAt"),
  output: [{ key: "id", type: "string", label: "Interview schedule ID" }, {
    key: "applicationId",
    type: "string",
    label: "Application ID",
  }, { key: "createdAt", type: "string", label: "Created at" }],
  sample: { id: "sched-101", applicationId: "app-101", createdAt: "2026-11-10T12:00:00.000Z" },
});
