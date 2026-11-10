import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import teamList from "../actions/team-list.ts";

/** `GET /v1/teams` has no sort or since filter, so it is read through `nextCursor` and diffed by id (added rows only). */
export default cursorSnapshot({
  key: "new-team",
  title: "New Team",
  description: "The run gets each newly created team: id and name.",
  action: teamList as ActionDefinition,
  listKey: "teams",
  output: [
    { key: "id", type: "number", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: 4, name: "Night shift" },
});
