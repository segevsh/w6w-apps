import listReports from "../actions/list-reports.ts";
import { readPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /reports` lists reports by id, name, access level, permalink and
 * summary flag only -- no created or modified stamp, so a "new or updated" twin has nothing to key on --
 * and has no documented order (https://developers.smartsheet.com/_spec/api/smartsheet/openapi.yaml,
 * `getReports`). The accessible reports are read whole (up to 10 pages of 100).
 */
export default snapshotTrigger({
  key: "new-report",
  title: "New Report",
  description: "The run gets each report that newly becomes accessible to the connected user.",
  output: [
    { key: "id", type: "number", label: "Report ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "accessLevel", type: "string", label: "Access level" },
    { key: "permalink", type: "string", label: "Link" },
    { key: "isSummaryReport", type: "boolean", label: "Is a sheet summary report" },
  ],
  sample: {
    id: 987654321,
    name: "Q2 Earnings",
    accessLevel: "OWNER",
    permalink: "https://app.smartsheet.com/reports/sample-report",
    isSummaryReport: false,
  },
  rows: (_p, ctx) => readPages("new-report", listReports, {}, ctx),
  idOf: (r) => String(r.id),
});
