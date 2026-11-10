import type { ActionDefinition } from "@w6w/types";
import photoCommentList from "../actions/photo-comment-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/photos/{id}/comments` for the photo the user picks; one photo's comments are a small
// collection, snapshotted each check (brief 9.1c).
export default snapshotTrigger<{ photoId: string }>({
  key: "new-photo-comment",
  title: "New Photo Comment",
  description: "The run gets each comment newly added to one photo.",
  params: [
    {
      key: "photoId",
      label: "Photo ID",
      type: "string",
      required: true,
      hint: "The photo to watch.",
    },
  ],
  action: photoCommentList as unknown as ActionDefinition,
  input: (p) => ({ photoId: p.photoId }),
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "creator_name", type: "string", label: "Author" },
    { key: "content", type: "string", label: "Comment" },
    { key: "commentable_id", type: "string", label: "Photo ID" },
    { key: "created_at", type: "number", label: "Created (Unix seconds)" },
  ],
  sample: {
    id: "4002",
    creator_name: "Ada Roe",
    content: "Looks good",
    commentable_id: "1234",
    commentable_type: "Photo",
    created_at: 1762646400,
  },
});
