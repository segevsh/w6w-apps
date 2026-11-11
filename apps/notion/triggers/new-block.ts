import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/get-many-blocks.ts";

interface Params {
  blockId: string;
}

export default snapshotTrigger<Params>({
  key: "new-block",
  title: "New Block in Page",
  description:
    "The run gets each block newly added at the top level of one Notion page (or block). Blocks come back in page order, not by time, so every check reads the page's children and compares ids.",
  action,
  params: [
    {
      key: "blockId",
      label: "Page or Block ID",
      type: "string",
      required: true,
      hint:
        "The page (or block) whose direct children to watch. Share it with the integration first.",
    },
  ],
  input: ({ blockId }) => ({ blockId }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Block ID" },
    { key: "type", type: "string", label: "Block type" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "has_children", type: "boolean", label: "Has children" },
  ],
  sample: {
    "object": "block",
    "id": "153104cd-477e-80ec-a87d-f7ff0236d35c",
    "type": "paragraph",
    "created_time": "2026-11-10T08:00:00.000Z",
    "last_edited_time": "2026-11-10T08:00:00.000Z",
    "has_children": false,
    "paragraph": {
      "rich_text": [],
    },
  },
});
