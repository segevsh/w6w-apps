import type { ActionDefinition } from "@w6w/types";
import { JobTreadClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

interface JobResponse {
  job: {
    id: string;
    name: string;
    number: string | null;
    status: string;
    createdAt: string;
    location: { id: string; name: string; address: string } | null;
    organization: { id: string; name: string };
  } | null;
}

const getJob: ActionDefinition<Input> = {
  key: "get-job",
  type: "read",
  resource: "job",
  title: "Get Job",
  description: "Read a job by id, including its location and organization (confirmed live 2026-09-15).",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "number", type: "string", label: "Job Number" },
    { key: "status", type: "string", label: "Status" },
    { key: "createdAt", type: "string", label: "Created At" },
    { key: "location", type: "object", label: "Location" },
    { key: "organization", type: "object", label: "Organization" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<JobResponse>({
      job: {
        $: { id: input.jobId },
        id: {},
        name: {},
        number: {},
        status: {},
        createdAt: {},
        location: { id: {}, name: {}, address: {} },
        organization: { id: {}, name: {} },
      },
    });
    if (!res.job) throw new Error(`job ${input.jobId} not found`);
    return res.job;
  },
};

export default getJob;
