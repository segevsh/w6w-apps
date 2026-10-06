import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/leadSource` - lists the lead sources. */
export default lookupAction({
  key: "list-lead-sources",
  title: "List Lead Sources",
  description: "List the lead sources.",
  path: "/zapier/leadSource",
});
