import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/list-views.ts";

interface Params {
  databaseId: string;
}

export default snapshotTrigger<Params>({
  key: "new-view",
  title: "New View",
  description:
    "The run gets each view newly added to one Notion database. Views come back in no guaranteed order, so every check reads the list and compares ids.",
  action,
  params: [
    {
      key: "databaseId",
      label: "Database ID",
      type: "string",
      required: true,
      hint: "The database whose views to watch. Share it with the integration first.",
    },
  ],
  input: ({ databaseId }) => ({ databaseId }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "View ID" },
    { key: "object", type: "string", label: "Object" },
  ],
  sample: {
    "object": "view",
    "id": "2b6f1c3d-8e4a-4f5b-9c7d-0a1b2c3d4e5f",
  },
});
