import type { ActionDefinition } from "@w6w/types";
import teamList from "../actions/team-list.ts";
import { listPages, snapshotTrigger } from "../lib/triggers.ts";

// Same snapshot as `new-team`, but a team whose row changed (name, handle, description,
// `updatedAt`) is an event too (brief 9.2): `GET /v2/teams` rows carry `updatedAt`.
export default snapshotTrigger<Record<string, never>>({
  key: "new-or-updated-team",
  title: "New or Updated Team",
  description: "The run gets each team that was created or changed (renamed, re-described).",
  load: listPages<Record<string, never>>(teamList as unknown as ActionDefinition, () => ({})),
  rowKey: (t) => String(t.id ?? ""),
  updated: true,
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "fields", type: "object", label: "Fields (name, handle)" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "team-1",
    fields: { name: "Platform", handle: "platform" },
    updatedAt: "2026-11-10T09:30:00Z",
  },
});
