import action from "../actions/list-companies.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-company",
  title: "New Company",
  description: "The run gets each company newly created in OnePageCRM, newest first.",
  action,
  wrapper: "company",
  sortBy: "created_at",
  sample: { company: { id: "company_1", name: "Acme Ltd", created_at: "2026-11-10T09:00:00Z" } },
});
