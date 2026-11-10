import type { ActionDefinition } from "@w6w/types";
import teamList from "../actions/team-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// `GET /v2/teams` lists the workspace's teams: a small bounded collection (one per department or
// squad), so each check snapshots every page and emits ids that were not there before (brief
// 9.1c). `team-search` returns the same records.
export default snapshotTrigger<Record<string, never>>({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created team.",
  load: listPages<Record<string, never>>(teamList as unknown as ActionDefinition, () => ({})),
  rowKey: (t) => String(t.id ?? ""),
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "fields", type: "object", label: "Fields (name, handle)" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "team-1",
    fields: { name: "Platform", handle: "platform" },
    createdAt: "2026-11-10T09:00:00Z",
  },
});
