import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/leadTypes` - lists the lead types. */
export default lookupAction({
  key: "list-lead-types",
  title: "List Lead Types",
  description: "List the lead types.",
  path: "/zapier/leadTypes",
});
