import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/get-many-users.ts";

export default snapshotTrigger<Record<string, never>>({
  key: "new-workspace-user",
  title: "New Workspace User",
  description:
    "The run gets each person or bot newly added to the Notion workspace. Notion lists users in no guaranteed order, so every check reads the whole (bounded) list and compares ids.",
  action,
  input: () => ({}),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "type", type: "string", label: "Type (person or bot)" },
    { key: "name", type: "string", label: "Name" },
    { key: "avatar_url", type: "string", label: "Avatar URL" },
    { key: "person", type: "object", label: "Person details" },
  ],
  sample: {
    "object": "user",
    "id": "d40e767c-d7af-4b18-a86d-55c61f1e39a4",
    "type": "person",
    "name": "Ada Lovelace",
    "avatar_url": null,
    "person": {
      "email": "ada@example.com",
    },
  },
});
