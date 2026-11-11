import locationList from "../actions/location-list.ts";
import { sinceTrigger } from "../lib/record-triggers.ts";

/**
 * Since-filter poll (brief 9.1 b) over `location-list`: ServiceTitan lists locations with `createdOnOrAfter`
 * (https://developer.servicetitan.io/apis/ -- the action's own filter; see the README note).
 */
export default sinceTrigger({
  key: "new-location",
  title: "New Location",
  description: "The run gets each location newly created in ServiceTitan.",
  action: locationList,
  mode: "new",
  filter: "createdOnOrAfter",
  output: [
    { key: "id", type: "number", label: "Location ID" },
    { key: "customerId", type: "number", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "createdOn", type: "string", label: "Created on" },
    { key: "modifiedOn", type: "string", label: "Modified on" },
  ],
  sample: {
    id: 201,
    customerId: 101,
    name: "Main office",
    createdOn: "2026-11-09T09:00:00Z",
    modifiedOn: "2026-11-09T09:00:00Z",
  },
});
