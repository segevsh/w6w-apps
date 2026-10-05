import { deleteAction } from "../lib/actions.ts";

export default deleteAction({
  key: "work-location-delete",
  resource: "work-location",
  title: "Delete Work Location",
  description: "Delete a work location.",
  path: "/work-locations",
  scope: "work-locations.read-write",
});
