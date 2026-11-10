import type { ActionDefinition } from "@w6w/types";
import iterationStoriesList from "../actions/iteration-stories-list.ts";
import { iterationIdParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/iterations/{iterationId}/stories` answers every story of the iteration as one array with no paging or order, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-iteration-story",
  title: "New Story in Iteration",
  description: "The run gets each story that is created in or added to one iteration.",
  action: iterationStoriesList as unknown as ActionDefinition,
  params: [iterationIdParam],
  input: (p) => ({ iterationId: p.iterationId }),
  output: [
    { key: "id", type: "number", label: "Story ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "iteration_id", type: "number", label: "Iteration ID" },
    { key: "story_type", type: "string", label: "Story type" },
  ],
  sample: { id: 1234, name: "Fix the login redirect", iteration_id: 7, story_type: "feature" },
});
