import keyList from "../actions/key-list.ts";
import { projectIdParam, sortedTrigger } from "../lib/depth.ts";

// GET /projects/{project_id}/keys takes `sort=created_at&order=desc`
// (https://developers.phrase.com/en/api/strings/keys/list-keys, verified 2026-11-10); page 1 of
// 100 is the newest-first feed. `key-search` returns the same records and is covered by this trigger.
export default sortedTrigger<{ projectId: string }>({
  key: "new-key",
  title: "New Key",
  description: "The run gets each newly created translation key in the chosen project.",
  action: keyList as never,
  params: [projectIdParam],
  sort: { sort: "created_at", order: "desc" },
  output: [
    { key: "id", type: "string", label: "Key ID" },
    { key: "name", type: "string", label: "Key name" },
    { key: "description", type: "string", label: "Description" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "key-sample-1",
    name: "home.title",
    description: "Home page heading",
    tags: ["web"],
    created_at: "2026-11-10T09:00:00Z",
    updated_at: "2026-11-10T09:00:00Z",
  },
});
