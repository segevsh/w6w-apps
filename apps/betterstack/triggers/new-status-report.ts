import { PAGE_SIZE, snapshotList } from "../lib/snapshot.ts";
import statusReportList from "../actions/status-report-list.ts";

export default snapshotList<{ status_page_id: string }>({
  key: "new-status-report",
  title: "New Status Report",
  description: "The run gets each newly published report on the chosen status page.",
  params: [{ key: "status_page_id", label: "Status page ID", type: "string", required: true }],
  action: statusReportList,
  input: ({ status_page_id }, page) => ({ status_page_id, page, per_page: PAGE_SIZE }),
  output: [
    { key: "id", type: "string", label: "Report ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "report_type", type: "string", label: "Report type" },
    { key: "aggregate_state", type: "string", label: "Aggregate state" },
  ],
  sample: {
    id: "8001",
    type: "status_report",
    title: "Status report title",
    report_type: "manual",
    aggregate_state: "downtime",
  },
});
