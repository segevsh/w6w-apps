import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/leadStatus` - lists the lead statuses. */
export default lookupAction({
  key: "list-lead-statuses",
  title: "List Lead Statuses",
  description: "List the lead statuses.",
  path: "/zapier/leadStatus",
});
