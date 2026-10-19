import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  commentId: string;
}

/** DELETE /v1/comments/{comment_id} — delete-a-comment. */
const action: ActionDefinition<Input> = {
  key: "delete-comment",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "parent", "type": "object", "label": "Parent" },
    { "key": "discussion_id", "type": "string", "label": "Discussion id" },
    { "key": "created_time", "type": "string", "label": "Created time" },
    { "key": "last_edited_time", "type": "string", "label": "Last edited time" },
    { "key": "created_by", "type": "object", "label": "Created by" },
    { "key": "rich_text", "type": "array", "label": "Rich text" },
    { "key": "display_name", "type": "object", "label": "Display name" },
    { "key": "original_content_deleted", "type": "boolean", "label": "Original content deleted" },
    { "key": "has_pending_attachments", "type": "boolean", "label": "Has pending attachments" },
    { "key": "attachments", "type": "array", "label": "Attachments" },
  ],
  idempotent: false,
  params: [{
    "key": "commentId",
    "label": "Comment ID",
    "type": "string",
    "required": true,
    "hint": "The ID of the comment to delete.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/comments/${pathId(input.commentId)}`, {
      method: "DELETE",
    });
  },
};

export default action;
