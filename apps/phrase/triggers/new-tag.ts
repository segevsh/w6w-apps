import tagList from "../actions/tag-list.ts";
import { projectIdParam, snapshotTrigger } from "../lib/depth.ts";

// GET /projects/{project_id}/tags has no sort or created-after filter
// (https://developers.phrase.com/en/api/strings/tags/list-tags, verified 2026-11-10); each check
// reads up to 5 pages of 100 tags and diffs the names. Tags are keyed by `name` (they carry no id).
export default snapshotTrigger<{ projectId: string }>({
  key: "new-tag",
  title: "New Tag",
  description: "The run gets each tag newly created in the chosen project.",
  action: tagList as never,
  params: [projectIdParam],
  input: (p) => ({ projectId: p.projectId }),
  idField: "name",
  output: [
    { key: "name", type: "string", label: "Tag name" },
    { key: "keys_count", type: "number", label: "Keys carrying the tag" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: { name: "release-4.2", keys_count: 0, created_at: "2026-11-10T09:00:00Z" },
});
