import type { ActionDefinition } from "@w6w/types";
import jobEstimatesList from "../actions/job-estimates-list.ts";
import { recordSnapshot } from "../lib/triggers.ts";

export default recordSnapshot({
  key: "new-job-estimate",
  title: "New Job Estimate",
  description: "The run gets each new estimate on the AccuLynx job you choose.",
  action: jobEstimatesList as unknown as ActionDefinition,
  params: [jobEstimatesList.params![0]],
  input: (params) => ({ jobId: params.jobId }),
  output: [{ key: "id", type: "string", label: "Estimate ID" }],
  sample: { id: "estimate-101", isPrimary: true },
});
