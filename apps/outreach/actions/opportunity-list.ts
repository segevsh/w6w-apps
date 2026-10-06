import { listAction } from "../lib/factory.ts";
export default listAction({
  key: "opportunity-list",
  title: "List Opportunities",
  noun: "Opportunity",
  type: "opportunity",
  path: "opportunities",
  description: "List opportunities with Outreach filters, sorting and cursor pagination.",
});
