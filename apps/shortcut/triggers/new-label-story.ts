import type { ActionDefinition } from "@w6w/types";
import labelStoriesList from "../actions/label-stories-list.ts";
import { labelIdParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/labels/{labelId}/stories` answers every story with the label as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-label-story",
  title: "New Story with Label",
  description: "The run gets each story that is created with or tagged with one label.",
  action: labelStoriesList as unknown as ActionDefinition,
  params: [labelIdParam],
  input: (p) => ({ labelId: p.labelId }),
  output: [
    { key: "id", type: "number", label: "Story ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "story_type", type: "string", label: "Story type" },
  ],
  sample: { id: 1234, name: "Fix the login redirect", story_type: "bug" },
});
