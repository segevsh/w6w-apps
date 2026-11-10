import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/list-comments.ts";

interface Params {
  blockId: string;
}

export default snapshotTrigger<Params>({
  key: "new-comment",
  title: "New Comment",
  description:
    "The run gets each new unresolved comment on one Notion page or block. Comments come back in no guaranteed order, so every check reads the thread list and compares ids. The connection needs the Read comments capability.",
  action,
  params: [
    {
      key: "blockId",
      label: "Page or Block ID",
      type: "string",
      required: true,
      hint: "The page (or block) whose comments to watch. Share it with the integration first.",
    },
  ],
  input: ({ blockId }) => ({ blockId }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "discussion_id", type: "string", label: "Discussion ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "created_by", type: "object", label: "Author" },
    { key: "rich_text", type: "array", label: "Text" },
  ],
  sample: {
    "object": "comment",
    "id": "94cc56ab-9f02-409d-9f99-1037e9fe502f",
    "discussion_id": "f1407351-36f5-4c49-a4c7-2c1b2b3b4b5b",
    "created_time": "2026-11-10T08:00:00.000Z",
    "created_by": {
      "object": "user",
      "id": "d40e767c-d7af-4b18-a86d-55c61f1e39a4",
    },
    "rich_text": [
      {
        "type": "text",
        "plain_text": "Looks good",
      },
    ],
  },
});
