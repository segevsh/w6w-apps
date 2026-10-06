import type { ActionDefinition } from "@w6w/types";
import { compact, itemResult, jsonApiBody, RootlyClient, seg, strList } from "../lib/client.ts";

interface Input {
  incident_id: string;
  summary: string;
  description?: string;
  kind?: "task" | "follow_up";
  priority?: "high" | "medium" | "low";
  status?: "open" | "in_progress" | "cancelled" | "done";
  due_date?: string;
  assigned_to_user_id?: number;
  assigned_to_group_ids?: string[] | string;
}

/** `POST /v1/incidents/{incident_id}/action_items` */
const incidentActionItemCreate: ActionDefinition<Input> = {
  key: "incident-action-item-create",
  type: "perform",
  resource: "incident-action-item",
  title: "Create Incident Action Item",
  description: "Add an action item to an incident.",
  idempotent: false,
  params: [
    {
      key: "incident_id",
      label: "Incident ID",
      type: "string",
      required: true,
    },
    {
      key: "summary",
      label: "Summary",
      type: "string",
      required: true,
    },
    {
      key: "description",
      label: "Description",
      type: "text",
    },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      options: [{ value: "task", label: "task" }, { value: "follow_up", label: "follow_up" }],
    },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [{ value: "high", label: "high" }, { value: "medium", label: "medium" }, {
        value: "low",
        label: "low",
      }],
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [{ value: "open", label: "open" }, { value: "in_progress", label: "in_progress" }, {
        value: "cancelled",
        label: "cancelled",
      }, { value: "done", label: "done" }],
    },
    {
      key: "due_date",
      label: "Due date",
      type: "string",
      hint: "ISO 8601 date.",
    },
    {
      key: "assigned_to_user_id",
      label: "Assignee user ID",
      type: "number",
    },
    {
      key: "assigned_to_group_ids",
      label: "Assignee team IDs",
      type: "array",
      item: { type: "string" },
    },
  ],
  output: [
    {
      key: "item",
      type: "object",
      label: "The record, flattened to its attributes plus `id` and `type`",
    },
    { key: "included", type: "array", label: "Side-loaded related records (same flattened shape)" },
  ],

  async execute(input, ctx) {
    const res = await new RootlyClient(ctx).request(
      "POST",
      `/v1/incidents/${seg(input.incident_id)}/action_items`,
      {
        body: jsonApiBody(
          "incident_action_items",
          compact({
            summary: input.summary,
            description: input.description,
            kind: input.kind,
            priority: input.priority,
            status: input.status,
            due_date: input.due_date,
            assigned_to_user_id: input.assigned_to_user_id,
            assigned_to_group_ids: strList(input.assigned_to_group_ids),
          }),
        ),
      },
    );
    return itemResult(res);
  },
};

export default incidentActionItemCreate;
