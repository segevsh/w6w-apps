import type { ActionDefinition } from "@w6w/types";
import epicStoriesList from "../actions/epic-stories-list.ts";
import { epicIdParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/epics/{epicId}/stories` answers every story of the epic as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-epic-story",
  title: "New Story in Epic",
  description: "The run gets each story that is created in or added to one epic.",
  action: epicStoriesList as unknown as ActionDefinition,
  params: [epicIdParam],
  input: (p) => ({ epicId: p.epicId }),
  output: [
    { key: "id", type: "number", label: "Story ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "epic_id", type: "number", label: "Epic ID" },
    { key: "story_type", type: "string", label: "Story type" },
  ],
  sample: { id: 1234, name: "Fix the login redirect", epic_id: 31, story_type: "feature" },
});
