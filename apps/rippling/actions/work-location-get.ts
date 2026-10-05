import { getAction } from "../lib/actions.ts";

export default getAction({
  key: "work-location-get",
  resource: "work-location",
  title: "Get Work Location",
  description: "Retrieve one work location by id.",
  path: "/work-locations",
  scope: "work-locations.read",
  expandable: [],
});
