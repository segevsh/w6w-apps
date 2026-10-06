import { lookupAction } from "../lib/lookup.ts";

/** `GET /zapier/fullyAutomatedActionPlans` - lists the fully automated action plans (ids for the apply and stop actions). */
export default lookupAction({
  key: "list-fully-automated-action-plans",
  title: "List Fully Automated Action Plans",
  description: "List the fully automated action plans (ids for the apply and stop actions).",
  path: "/zapier/fullyAutomatedActionPlans",
});
