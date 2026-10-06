import { updateAction } from "../lib/actions.ts";

export default updateAction({
  key: "job-update",
  resource: "job",
  path: "/jobs",
  idKey: "jobId",
  idLabel: "Job ID",
  title: "Update Job",
  description:
    "Change a job's title, manager, status, contract or due date. Unset fields are left alone.",
  fields: [
    { key: "title", wire: "title", label: "Title" },
    { key: "managerId", wire: "manager_id", label: "Manager staff ID", type: "number" },
    {
      key: "statusId",
      wire: "status_id",
      label: "Status ID",
      type: "number",
      hint: "Bypasses progressions — use deliberately.",
    },
    {
      key: "affiliationId",
      wire: "affiliation_id",
      label: "Affiliation ID",
      type: "number",
      advanced: true,
    },
    {
      key: "contractId",
      wire: "contract_id",
      label: "Contract ID",
      type: "number",
      advanced: true,
    },
    {
      key: "dateDue",
      wire: "date_due",
      label: "Due",
      type: "number",
      advanced: true,
      hint: "Unix timestamp, seconds.",
    },
    { key: "rateId", wire: "rate_id", label: "Rate ID", type: "number", advanced: true },
  ],
});
