import keyList from "../actions/key-list.ts";
import { projectIdParam, sortedTrigger } from "../lib/depth.ts";

// Same endpoint with `sort=updated_at&order=desc` (verified 2026-11-10); the id carries `updated_at`
// so an edit is a new event (brief 9.2).
export default sortedTrigger<{ projectId: string }>({
  key: "new-or-updated-key",
  title: "New or Updated Key",
  description:
    "The run gets each translation key in the chosen project that was created or edited.",
  action: keyList as never,
  params: [projectIdParam],
  sort: { sort: "updated_at", order: "desc" },
  stamp: "updated_at",
  output: [
    { key: "id", type: "string", label: "Key ID" },
    { key: "name", type: "string", label: "Key name" },
    { key: "description", type: "string", label: "Description" },
    { key: "tags", type: "array", label: "Tags" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "key-sample-1",
    name: "home.title",
    description: "Home page heading",
    tags: ["web"],
    updated_at: "2026-11-10T09:30:00Z",
  },
});
