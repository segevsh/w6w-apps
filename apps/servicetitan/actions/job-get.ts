import type { ActionDefinition } from "@w6w/types";
import { ServiceTitanClient } from "../lib/client.ts";

/** `GET /jpm/v2/tenant/{tenant}/jobs/{id}` — one job. */
interface Input {
  id: number;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get a Job",
  description: "Get a single job by its numeric id.",
  params: [{ key: "id", label: "Job ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "jobNumber", type: "string", label: "Job number" },
    { key: "jobStatus", type: "string", label: "Status" },
    { key: "customerId", type: "number", label: "Customer ID" },
    { key: "locationId", type: "number", label: "Location ID" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "summary", type: "string", label: "Summary" },
  ],

  async execute(input, ctx) {
    return await new ServiceTitanClient(ctx).request(
      "jpm",
      `/jobs/${encodeURIComponent(String(input.id))}`,
    );
  },
};

export default jobGet;
