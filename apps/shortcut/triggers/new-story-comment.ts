import type { ActionDefinition } from "@w6w/types";
import storyCommentList from "../actions/story-comment-list.ts";
import { storyIdParam } from "../lib/params.ts";
import { snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /api/v3/stories/{storyId}/comments` answers every comment of the story as one array with no paging, so each check diffs the ids. */
export default snapshotTrigger({
  key: "new-story-comment",
  title: "New Story Comment",
  description: "The run gets each new comment on one story.",
  action: storyCommentList as unknown as ActionDefinition,
  params: [storyIdParam],
  input: (p) => ({ storyId: p.storyId }),
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { id: 92, text: "Fixed in the next build.", created_at: "2026-11-10T09:00:00Z" },
});
