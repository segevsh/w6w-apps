import type { ActionDefinition } from "@w6w/types";
import epicCommentList from "../actions/epic-comment-list.ts";
import { epicIdParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/epics/{epicId}/comments` answers every comment of the epic as one array with no paging, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-epic-comment",
  title: "New Epic Comment",
  description: "The run gets each new comment on one epic.",
  action: epicCommentList as unknown as ActionDefinition,
  params: [epicIdParam],
  input: (p) => ({ epicId: p.epicId }),
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 91, text: "Scope agreed.", created_at: "2026-11-10T09:00:00Z" },
});
