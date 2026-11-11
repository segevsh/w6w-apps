import type { TriggerDefinition } from "@w6w/types";
import assignmentList from "../actions/assignment-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/**
 * `GET /resource-planner/assignments`
 * (https://developers.everhour.com/api-reference/schedule/get-all-assignments.md) answers the
 * team's schedule assignments (time off included) in one unpaged response, diffed as a snapshot;
 * only additions emit.
 */
const trigger: TriggerDefinition = snapshotTrigger({
  key: "new-assignment",
  title: "New Schedule Assignment",
  description: "The run gets each resource-planner assignment or time-off entry newly scheduled.",
  noun: "assignments",
  output: [
    { key: "id", type: "number", label: "Assignment ID" },
    { key: "type", type: "string", label: "project or time-off" },
    { key: "user", type: "number", label: "User ID" },
    { key: "project", type: "string", label: "Project ID" },
    { key: "startDate", type: "string", label: "Start date" },
    { key: "endDate", type: "string", label: "End date" },
    { key: "time", type: "number", label: "Scheduled seconds" },
  ],
  sample: {
    id: 41827,
    type: "project",
    user: 1304,
    project: "ev:1234567890",
    startDate: "2026-11-16",
    endDate: "2026-11-20",
    time: 144000,
  },
  read: (_params, _page, ctx) => assignmentList.execute({}, ctx),
  keyOf: (item) => String((item as { id?: unknown }).id ?? ""),
});

export default trigger;
