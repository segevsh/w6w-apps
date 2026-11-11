import type { ActionDefinition } from "@w6w/types";
import labelList from "../actions/label-list.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/labels` answers every label as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-label",
  title: "New Label",
  description: "The run gets each newly created label.",
  action: labelList as unknown as ActionDefinition,
  input: () => ({}),
  output: [
    { key: "id", type: "number", label: "Label ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Colour" },
  ],
  sample: { id: 12, name: "bug", color: "#ff0000" },
});
