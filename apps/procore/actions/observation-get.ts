import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  observationId: number;
}

/** `GET /rest/v1.0/observations/items/{id}?project_id=` */
const observationGet: ActionDefinition<Input> = {
  key: "observation-get",
  type: "read",
  resource: "observation",
  title: "Get Observation",
  description: "Fetch one observation item.",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "observationId",
      label: "Observation ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Observation ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "priority", type: "string", label: "Priority" },
    { key: "due_date", type: "string", label: "Due date" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/observations/items/${encodeURIComponent(String(input.observationId))}`,
      { companyId: input.companyId, query: { project_id: input.projectId } },
    );
    return reply.data;
  },
};

export default observationGet;
