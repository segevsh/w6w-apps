import action from "../actions/list-companies.ts";
import { recordFeed } from "../lib/triggers.ts";

export default recordFeed({
  key: "new-or-updated-company",
  title: "New or Updated Company",
  description:
    "The run gets each company that is created or edited in OnePageCRM, most recently modified first. Fires once per modification.",
  action,
  wrapper: "company",
  sortBy: "modified_at",
  sample: { company: { id: "company_1", name: "Acme Ltd", modified_at: "2026-11-10T09:00:00Z" } },
});
