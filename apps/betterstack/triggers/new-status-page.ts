import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import statusPageList from "../actions/status-page-list.ts";

export default snapshotList({
  key: "new-status-page",
  title: "New Status Page",
  description: "The run gets each newly created status page.",
  action: statusPageList,
  input: (_params, page) => ({ page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Status page ID" },
    { key: "company_name", type: "string", label: "Company name" },
    { key: "subdomain", type: "string", label: "Subdomain" },
    { key: "aggregate_state", type: "string", label: "Aggregate state" },
  ],
  sample: {
    id: "6001",
    type: "status_page",
    company_name: "Best company",
    subdomain: "best-company",
    aggregate_state: "operational",
  },
});
