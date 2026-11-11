import type { ActionDefinition } from "@w6w/types";
import teamList from "../actions/team-list.ts";
import { idField, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /teams` documents no query parameters; an organization's teams fit one response. */
export default snapshotTrigger({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created team.",
  action: teamList as unknown as ActionDefinition,
  paged: false,
  input: () => ({}),
  items: (result) => (result as { teams?: unknown[] }).teams ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "users", type: "array", label: "Members" },
  ],
  sample: { id: "team_1", name: "Support", users: [{ id: "usr_1", email: "sam@example.com" }] },
});
