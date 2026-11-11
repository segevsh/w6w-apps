import type { ActionDefinition } from "@w6w/types";
import { snapshotTrigger } from "../lib/triggers.ts";
import trackerList from "../actions/tracker-list.ts";

export default snapshotTrigger({
  key: "new-tracker",
  title: "New Tracker",
  description: "The run gets each newly created tracking number (tracker).",
  action: trackerList as unknown as ActionDefinition,
  listKey: "trackers",
  withCompany: true,
  output: [
    { key: "id", type: "string", label: "Tracker ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "TRK1", name: "Website visitors", type: "session", status: "active" },
});
