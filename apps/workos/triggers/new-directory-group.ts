import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import directoryGroupList from "../actions/directory-group-list.ts";

// WorkOS: GET /directory_groups
// `order=desc` is "ordered by the creation time", newest first (https://workos.com/docs/reference/directory-sync/directory-group/list, verified 2026-11-10).
// Newest-first, brief 9.1 a.
export default pollFromListAction<{ directoryId: string }>({
  key: "new-directory-group",
  title: "New Directory Group",
  description: "The run gets each group newly pushed into the chosen directory.",
  action: directoryGroupList as unknown as ActionDefinition,
  input: ({ directoryId }) => ({ directoryId, order: "desc", limit: 50 }),
  items: (result) => (result as { groups?: unknown[] }).groups ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{ key: "directoryId", label: "Directory ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "directory_id", type: "string", label: "Directory ID" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "directory_group_01SAMPLE",
    name: "Engineering",
    directory_id: "directory_01SAMPLE",
    created_at: "2026-11-09T10:00:00.000Z",
  },
  maxPages: 1,
});
