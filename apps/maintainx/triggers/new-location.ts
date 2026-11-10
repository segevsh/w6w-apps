import type { ActionDefinition } from "@w6w/types";
import { cursorSnapshot } from "../lib/triggers.ts";
import locationList from "../actions/location-list.ts";

/** `GET /v1/locations` has no sort or since filter, so it is read through `nextCursor` and diffed by id (added rows only). */
export default cursorSnapshot({
  key: "new-location",
  title: "New Location",
  description: "The run gets each newly created location: id, name, address and parent.",
  action: locationList as ActionDefinition,
  listKey: "locations",
  output: [
    { key: "id", type: "number", label: "Location ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "string", label: "Address" },
    { key: "parentId", type: "number", label: "Parent location ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: { id: 12, name: "Plant 2", address: "1 Main St", createdAt: "2026-11-09T09:00:00.000Z" },
});
