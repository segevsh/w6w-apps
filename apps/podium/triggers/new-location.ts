import locationList from "../actions/location-list.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** The run gets each location newly added to the organisation (`GET /v4/locations`, a small whole collection diffed by uid each check). Brief 9.1 (c). */
export default snapshotTrigger({
  key: "new-location",
  title: "New Location",
  description:
    "The run gets each location newly added to the organisation (`GET /v4/locations`, a small whole collection diffed by uid each check).",
  action: locationList,
  output: [{ key: "uid", type: "string", label: "UID" }, {
    key: "name",
    type: "string",
    label: "Name",
  }, { key: "createdAt", type: "string", label: "Created at" }],
  sample: { uid: "location_1", name: "Downtown", createdAt: "2026-11-10T12:00:00.000Z" },
});
