import type { ActionDefinition } from "@w6w/types";
import scheduleList from "../actions/schedule-list.ts";
import { idField, SNAPSHOT_PAGE_SIZE, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /v1/schedules` documents no sort; an organization's on-call schedules are few, so diff the ids. */
export default snapshotTrigger({
  key: "new-schedule",
  title: "New Schedule",
  description: "The run gets each newly created on-call schedule.",
  action: scheduleList as unknown as ActionDefinition,
  input: () => ({ page_number: 1, page_size: SNAPSHOT_PAGE_SIZE }),
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Schedule ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "sch_1",
    type: "schedules",
    name: "Primary on-call",
    created_at: "2026-11-10T09:00:00Z",
  },
});
