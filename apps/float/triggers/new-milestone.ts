import { snapshotTrigger } from "../lib/triggers.ts";
import milestoneList from "../actions/milestone-list.ts";

export default snapshotTrigger({
  key: "new-milestone",
  title: "New Milestone",
  description: "The run gets each milestone newly added to a Float project.",
  action: milestoneList,
  idKey: "milestone_id",
  output: [
    { key: "milestone_id", type: "number", label: "Milestone ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "project_id", type: "number", label: "Project ID" },
    { key: "date", type: "string", label: "Start date/time" },
  ],
  sample: { milestone_id: 701, name: "Launch", project_id: 301, date: "2026-12-01" },
});
