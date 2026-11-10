import type { ActionDefinition } from "@w6w/types";
import jobRepresentativesList from "../actions/job-representatives-list.ts";
import { recordSnapshot } from "../lib/triggers.ts";

export default recordSnapshot({
  key: "new-job-representative",
  title: "New Job Representative",
  description: "The run gets each representative newly assigned to the AccuLynx job you choose.",
  action: jobRepresentativesList as unknown as ActionDefinition,
  params: [jobRepresentativesList.params![0]],
  input: (params) => ({ jobId: params.jobId }),
  output: [
    { key: "id", type: "string", label: "Representative ID" },
    { key: "type", type: "string", label: "Representative type" },
  ],
  sample: { id: "representative-101", type: "SalesOwner" },
});
