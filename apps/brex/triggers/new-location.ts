import locationList from "../actions/location-list.ts";
import { newRecordTrigger } from "../lib/snapshots.ts";

/**
 * `GET /v2/locations` lists a company's locations: a small directory with no sort or since filter, so every
 * check reads all of it (`limit` 1000, `cursor` paging) and diffs the ids.
 * https://developer.brex.com/openapi/team_api/locations/listlocations.md (verified 2026-11-10)
 */
export default newRecordTrigger({
  key: "new-location",
  title: "New Location",
  description: "The run gets each location newly created in your Brex account.",
  action: locationList,
  output: [
    { key: "id", type: "string", label: "Location ID" },
    { key: "name", type: "string", label: "Name" },
  ],
  sample: { id: "culoc_sample0001", name: "Sample Location" },
});
