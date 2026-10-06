import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  name: string;
  typeId: number;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string;
  assigneeIds?: number[];
}

/**
 * `POST /rest/v1.0/observations/items` — body `{ project_id, observation: {...} }`;
 * the documented required observation fields are `name` and `type_id`.
 */
const observationCreate: ActionDefinition<Input> = {
  key: "observation-create",
  type: "perform",
  resource: "observation",
  title: "Create Observation",
  description: "Create an observation item on a project.",
  idempotent: false,
  params: [
    companyIdParam,
    projectIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "typeId",
      label: "Observation type ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "ID of an observation type configured for the project.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: ["Low", "Medium", "High", "Urgent"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "initiated", label: "Initiated" },
        { value: "ready_for_review", label: "Ready for review" },
        { value: "not_accepted", label: "Not accepted" },
        { value: "closed", label: "Closed" },
        { value: "draft", label: "Draft" },
      ],
    },
    { key: "dueDate", label: "Due date", type: "date" },
    { key: "assigneeIds", label: "Assignee user IDs", type: "array", item: { type: "number" } },
  ],
  output: [
    { key: "id", type: "number", label: "Observation ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const observation: Record<string, unknown> = { name: input.name, type_id: input.typeId };
    if (input.description) observation.description = input.description;
    if (input.priority) observation.priority = input.priority;
    if (input.status) observation.status = input.status;
    if (input.dueDate) observation.due_date = input.dueDate;
    if (input.assigneeIds?.length) observation.assignee_ids = input.assigneeIds;
    const reply = await new ProcoreClient(ctx).request("/rest/v1.0/observations/items", {
      method: "POST",
      body: { project_id: input.projectId, observation },
      companyId: input.companyId,
    });
    return reply.data;
  },
};

export default observationCreate;
