import type { ActionDefinition } from "@w6w/types";
import iterationList from "../actions/iteration-list.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/iterations` answers every iteration as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-iteration",
  title: "New Iteration",
  description: "The run gets each newly created iteration.",
  action: iterationList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Iteration ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "start_date", type: "string", label: "Start date" },
  ],
  sample: { id: 7, name: "Sprint 12", status: "unstarted", start_date: "2026-11-16" },
});
