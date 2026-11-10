import { asArray, COMPANY_PARAM, requireId, snapshotTrigger, uuidOf } from "../lib/triggers.ts";
import jobCompensationList from "../actions/job-compensation-list.ts";
export default snapshotTrigger({
  key: "new-job-compensation",
  title: "New Job Compensation",
  description: "The run gets each compensation record added to the chosen job.",
  action: jobCompensationList,
  params: [{
    key: "jobId",
    label: "Job ID",
    type: "string",
    required: true,
    default: "",
    hint: "The job UUID to watch.",
  }],
  input: (p) => ({ jobId: requireId(p.jobId, "jobId"), returnAll: true }),
  items: asArray,
  idOf: uuidOf,
  updated: false,
  output: [
    { key: "uuid", type: "string", label: "Compensation UUID" },
    { key: "rate", type: "string", label: "Rate" },
    { key: "payment_unit", type: "string", label: "Payment unit" },
    { key: "effective_date", type: "string", label: "Effective date" },
  ],
  sample: {
    uuid: "compensation-1",
    rate: "50000.00",
    payment_unit: "Year",
    effective_date: "2026-11-01",
  },
});
