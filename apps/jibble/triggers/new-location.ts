import type { ActionDefinition } from "@w6w/types";
import { odataFeed } from "../lib/triggers.ts";
import locationList from "../actions/location-list.ts";

/** OData `$orderby` newest-first; `createdAt`/`updatedAt` are on the entity ($metadata, verified 2026-11-10). */
export default odataFeed({
  key: "new-location",
  title: "New Location",
  description: "The run gets each newly created location: id, name, address and timestamps.",
  action: locationList as ActionDefinition,
  orderBy: "createdAt desc",
  output: [
    { key: "id", type: "string", label: "Location ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: "location-1",
    name: "Head office",
    status: "Active",
    createdAt: "2026-11-09T09:00:00Z",
    updatedAt: "2026-11-09T09:00:00Z",
  },
});
