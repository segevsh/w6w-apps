import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listJobs from "../actions/list-jobs.ts";

interface Params {
  organizationId: string;
}

export default pollFromListAction<Params>({
  key: "new-job",
  title: "New Job",
  description: "Fires when a new JobTread job is created in the selected organization.",
  action: listJobs as unknown as ActionDefinition,
  params: [{ key: "organizationId", label: "Organization ID", type: "string", required: true }],
  input: ({ organizationId }) => ({
    organizationId,
    size: 100,
    sortBy: [{ field: "createdAt", order: "desc" }],
  }),
  items: (result) => (result as { nodes?: unknown[] }).nodes ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Job ID" }],
  sample: { id: "job_123" },
});
