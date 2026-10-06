import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  punchItemId: number;
}

/** `GET /rest/v1.0/punch_items/{id}?project_id=` */
const punchItemGet: ActionDefinition<Input> = {
  key: "punch-item-get",
  type: "read",
  resource: "punch-item",
  title: "Get Punch Item",
  description: "Fetch one punch item with its comments and ball-in-court.",
  params: [
    companyIdParam,
    projectIdParam,
    {
      key: "punchItemId",
      label: "Punch item ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Punch item ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "due_date", type: "string", label: "Due date" },
    { key: "comments", type: "array", label: "Comments" },
  ],

  async execute(input, ctx) {
    const reply = await new ProcoreClient(ctx).request(
      `/rest/v1.0/punch_items/${encodeURIComponent(String(input.punchItemId))}`,
      { companyId: input.companyId, query: { project_id: input.projectId } },
    );
    return reply.data;
  },
};

export default punchItemGet;
