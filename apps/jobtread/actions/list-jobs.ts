import type { ActionDefinition } from "@w6w/types";
import { connectionArgs, JobTreadClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  size?: number;
  page?: string;
  where?: unknown;
  sortBy?: unknown;
}

interface JobNode {
  id: string;
  name: string;
  number: string | null;
  status: string;
  createdAt: string;
}

interface OrganizationJobsResponse {
  organization: {
    jobs: { nodes: JobNode[]; nextPage: string | null };
  } | null;
}

const listJobs: ActionDefinition<Input> = {
  key: "list-jobs",
  type: "search",
  resource: "job",
  title: "List Jobs",
  description: "List an organization's jobs (organization.jobs). Fields confirmed live 2026-09-15.",
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "size", label: "Page Size", type: "number", default: 25 },
    { key: "page", label: "Page Cursor", type: "string", hint: "From a previous call's nextPage." },
    { key: "where", label: "Filter", type: "json", hint: 'Pave filter, e.g. `["status", "=", "active"]`.' },
    { key: "sortBy", label: "Sort", type: "json", hint: 'JSON array of `{"field": "createdAt", "order": "desc"}`.' },
  ],
  output: [
    { key: "nodes", type: "array", label: "Jobs" },
    { key: "nextPage", type: "string", label: "Next Page Cursor" },
  ],

  async execute(input, ctx) {
    const client = new JobTreadClient(ctx);
    const res = await client.query<OrganizationJobsResponse>({
      organization: {
        $: { id: input.organizationId },
        jobs: {
          $: connectionArgs(input),
          nextPage: {},
          nodes: { id: {}, name: {}, number: {}, status: {}, createdAt: {} },
        },
      },
    });
    if (!res.organization) throw new Error(`organization ${input.organizationId} not found`);
    return res.organization.jobs;
  },
};

export default listJobs;
