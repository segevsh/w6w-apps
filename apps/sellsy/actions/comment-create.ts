import { writeAction } from "../lib/actions.ts";

export default writeAction({
  "key": "comment",
  "noun": "comment",
  "path": "/comments",
  "scope": "comments.write",
  "resultKey": "comment",
  "mode": "create",
  "description":
    "Add a comment (a note on the timeline) to a company, individual, contact, opportunity or document. Needs the `comments.write` scope.",
  "fields": [
    {
      "key": "description",
      "label": "Comment",
      "type": "text",
      "required": true,
    },
    {
      "key": "related",
      "label": "Related objects (JSON)",
      "as": "json",
      "hint": 'What the comment attaches to: [{"type": "company", "id": 12}].',
    },
    {
      "key": "parent_id",
      "label": "Parent comment ID",
      "as": "int",
      "hint": "Set to reply to a comment.",
    },
    {
      "key": "mentioned_staff_ids",
      "label": "Mentioned staff IDs",
      "as": "intList",
      "hint": "Comma-separated.",
    },
  ],
});
