import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  locationId: string;
  name: string;
}

interface CreateJobResponse {
  createJob: { createdJob: { id: string; name: string; status: string } };
}

const createJob: ActionDefinition<Input> = {
  key: "create-job",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description:
    "Create a job under a location. `locationId` and `name` confirmed live (2026-09-15) as the " +
    'required fields — the query reached a real permission check ("You don\'t have permission ' +
    'to create a job for this location or it does not exist") once both were present.',
  idempotent: false,
  params: [
    { key: "locationId", label: "Location ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<CreateJobResponse>({
      createJob: {
        $: { locationId: input.locationId, name: input.name },
        createdJob: { id: {}, name: {}, status: {} },
      },
    });
    return res.createJob.createdJob;
  },
};

export default createJob;
