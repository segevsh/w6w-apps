import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/traditionalActionPlans` - lists the traditional action plans (ids for the apply and stop actions). */
export default lookupAction({
  key: "list-traditional-action-plans",
  title: "List Traditional Action Plans",
  description: "List the traditional action plans (ids for the apply and stop actions).",
  path: "/zapier/traditionalActionPlans",
});
