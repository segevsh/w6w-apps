import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId: number;
  projectId: number;
}

/** `GET /rest/v1.0/projects/{id}?company_id=` */
const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Fetch one project: address, dates, stage, value and time zone.",
  params: [{ ...companyIdParam, required: true }, projectIdParam],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "display_name", type: "string", label: "Display name" },
    { key: "project_number", type: "string", label: "Project number" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "address", type: "string", label: "Address" },
    { key: "start_date", type: "string", label: "Start date" },
    { key: "completion_date", type: "string", label: "Completion date" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/projects/${encodeURIComponent(String(input.projectId))}`,
      { companyId: input.companyId, query: { company_id: input.companyId } },
    );
    return reply.data;
  },
};

export default projectGet;
