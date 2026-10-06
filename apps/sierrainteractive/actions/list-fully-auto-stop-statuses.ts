import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/getFullyAutoActionPlanStopStatus` - lists the accepted statuses when stopping a fully automated action plan. */
export default lookupAction({
  key: "list-fully-auto-stop-statuses",
  title: "List Fully Automated Stop Statuses",
  description: "List the accepted statuses when stopping a fully automated action plan.",
  path: "/zapier/getFullyAutoActionPlanStopStatus",
});
