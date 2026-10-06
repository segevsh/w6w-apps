import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/mlsRegion` - lists the MLS regions. */
export default lookupAction({
  key: "list-mls-regions",
  title: "List MLS Regions",
  description: "List the MLS regions.",
  path: "/zapier/mlsRegion",
});
