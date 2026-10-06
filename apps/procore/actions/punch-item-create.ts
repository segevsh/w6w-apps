import type { ActionDefinition } from "@w6w/types";
import { companyIdParam, ProcoreClient, projectIdParam } from "../lib/client.ts";

interface Input {
  companyId?: number;
  projectId: number;
  name: string;
  description?: string;
  priority?: string;
  due?: string;
  locationId?: number;
  assigneeIds?: number[];
}

/**
 * `POST /rest/v1.0/punch_items` — body `{ project_id, punch_item: {...} }`; the
 * only documented required field of `punch_item` is `name`. Assignees go in
 * `login_information_ids`.
 */
const punchItemCreate: ActionDefinition<Input> = {
  key: "punch-item-create",
  type: "perform",
  resource: "punch-item",
  title: "Create Punch Item",
  description: "Create a punch list item on a project.",
  idempotent: false,
  params: [
    companyIdParam,
    projectIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: ["low", "medium", "high"].map((v) => ({ value: v, label: v })),
    },
    { key: "due", label: "Due date", type: "date" },
    {
      key: "locationId",
      label: "Location ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "assigneeIds",
      label: "Assignee user IDs",
      type: "array",
      item: { type: "number" },
      hint: "Sent as `login_information_ids`.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Punch item ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const punch_item: Record<string, unknown> = { name: input.name };
    if (input.description) punch_item.description = input.description;
    if (input.priority) punch_item.priority = input.priority;
    if (input.due) punch_item.due = input.due;
    if (input.locationId) punch_item.location_id = input.locationId;
    if (input.assigneeIds?.length) punch_item.login_information_ids = input.assigneeIds;
    const reply = await new ProcoreClient(ctx).request("/rest/v1.0/punch_items", {
      method: "POST",
      body: { project_id: input.projectId, punch_item },
      companyId: input.companyId,
    });
    return reply.data;
  },
};

export default punchItemCreate;
