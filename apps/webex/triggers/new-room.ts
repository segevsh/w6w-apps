import { snapshotTrigger } from "../lib/polls.ts";
import listRooms from "../actions/list-rooms.ts";

/**
 * `GET /rooms?max=1000&sortBy=id` (the `list-rooms` action): every space the connection is in. Webex
 * documents `max` as 1–1000 and gives `sortBy=created` no direction, so this diffs the whole list
 * rather than trusting an order; a full 1000-row page throws (see `lib/polls.ts`).
 */
const newRoom = snapshotTrigger({
  key: "new-room",
  title: "New Space",
  description:
    "The run gets each Webex space the connection newly joins or creates, including spaces other people add you to (checked every 5 minutes; fails if you are in 1000 or more spaces).",
  action: listRooms,
  input: () => ({ max: 1000, sortBy: "id" as const }),
  cap: 1000,
  output: [
    { key: "id", type: "string", label: "Space ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "type", type: "string", label: "Type (direct or group)" },
    { key: "isLocked", type: "boolean", label: "Locked" },
    { key: "teamId", type: "string", label: "Team ID" },
    { key: "created", type: "string", label: "Created (ISO 8601)" },
  ],
  sample: {
    id: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
    title: "Project Unicorn",
    type: "group",
    isLocked: false,
    lastActivity: "2026-11-10T12:00:00.000Z",
    creatorId: "Y2lzY29zcGFyazovL3VzL1BFT1BMRS83MTZlOWQxYy1hMjM1LTQ4MTUtOTExNS1hMzRmYzE4YjVlOTI",
    created: "2026-11-10T11:00:00.000Z",
  },
});

export default newRoom;
