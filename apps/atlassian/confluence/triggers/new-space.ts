import spaceList from "../actions/space-list.ts";
import { snapshotRows } from "../lib/triggers.ts";

/**
 * Wraps `space-list` (GET /wiki/api/v2/spaces). The spaces of one site are a bounded collection
 * (pages of 100 until the cursor ends); the sort enum offers `id`, `key` and `name` but not creation
 * time, so the whole list is compared with the previous check and only additions are emitted
 * (https://developer.atlassian.com/cloud/confluence/rest/v2/api-group-space/, verified 2026-11-10).
 */
export default snapshotRows({
  key: "new-space",
  title: "New Space",
  description: "The run gets each newly created Confluence space.",
  action: spaceList,
  all: true,
  output: [
    { key: "change", type: "string", label: "Change (added)" },
    { key: "key", type: "string", label: "Space ID" },
    { key: "values", type: "object", label: "Space (id, key, name, type, status, createdAt)" },
  ],
  sample: {
    change: "added",
    key: "65540",
    values: {
      id: "65540",
      key: "ENG",
      name: "Engineering",
      type: "global",
      status: "current",
      createdAt: "2026-11-09T09:00:00.000Z",
    },
  },
});
