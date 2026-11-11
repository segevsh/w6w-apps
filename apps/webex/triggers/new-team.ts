import { snapshotTrigger } from "../lib/polls.ts";
import listTeams from "../actions/list-teams.ts";

/**
 * `GET /teams?max=100` (the `list-teams` action): the teams the connection belongs to. Webex states
 * no ceiling for `max` on this list, so a full default page of 100 is treated as possibly cut short
 * and throws (see `lib/polls.ts`).
 */
const newTeam = snapshotTrigger({
  key: "new-team",
  title: "New Team",
  description:
    "The run gets each Webex team the connection newly belongs to (checked every 5 minutes; fails if you are in 100 or more teams).",
  action: listTeams,
  input: () => ({ max: 100 }),
  cap: 100,
  output: [
    { key: "id", type: "string", label: "Team ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "creatorId", type: "string", label: "Creator person ID" },
    { key: "created", type: "string", label: "Created (ISO 8601)" },
  ],
  sample: {
    id: "Y2lzY29zcGFyazovL3VzL1RFQU0vMTNlMThmNDAtNDJmYy0xMWU2LWE5ZDgtMjExYTBkYzc5NzY5",
    name: "Project Unicorn",
    creatorId: "Y2lzY29zcGFyazovL3VzL1BFT1BMRS83MTZlOWQxYy1hMjM1LTQ4MTUtOTExNS1hMzRmYzE4YjVlOTI",
    created: "2026-11-10T11:00:00.000Z",
  },
});

export default newTeam;
