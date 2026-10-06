import type { ActionDefinition } from "@w6w/types";
import {
  asOptionalJson,
  compact,
  encodeId,
  MaintainXClient,
  toIdList,
  toList,
} from "../lib/client.ts";
import { idParam, organizationIdParam, prioritySelect } from "../lib/params.ts";

/**
 * `PATCH /v1/workorders/{id}` — only the fields that are set are sent. Status is
 * NOT editable here: the vendor moves it through its own endpoint (see
 * `workorder-status-set`). `assignees` and `categories`, when set, replace the
 * stored list.
 */
interface Input {
  workOrderId: number;
  title?: string;
  description?: string;
  priority?: string;
  assetId?: number;
  locationId?: number;
  dueDate?: string;
  startDate?: string;
  estimatedTime?: number;
  categories?: string;
  assigneeUsers?: string;
  assigneeTeamIds?: string;
  vendorIds?: string;
  externalId?: string;
  extraFields?: string | Record<string, string>;
  organizationId?: number;
}

const workorderUpdate: ActionDefinition<Input> = {
  key: "workorder-update",
  type: "perform",
  resource: "workorder",
  title: "Update Work Order",
  description: "Change fields on an existing work order; only the fields you set are sent.",
  idempotent: true,
  params: [
    idParam("workOrderId", "Work order ID"),
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    prioritySelect(),
    { key: "assetId", label: "Asset ID", type: "number" },
    { key: "locationId", label: "Location ID", type: "number" },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "startDate", label: "Start date", type: "datetime" },
    { key: "estimatedTime", label: "Estimated time (seconds)", type: "number" },
    {
      key: "categories",
      label: "Categories",
      type: "string",
      hint: "Comma-separated; replaces the list.",
    },
    {
      key: "assigneeUsers",
      label: "Assignee users",
      type: "string",
      hint: "Comma-separated user ids or emails; replaces the assignees.",
    },
    { key: "assigneeTeamIds", label: "Assignee team IDs", type: "string" },
    { key: "vendorIds", label: "Vendor IDs", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "extraFields", label: "Custom fields (JSON)", type: "json" },
    organizationIdParam,
  ],
  output: [{ key: "data", type: "object", label: "The updated work order" }],

  async execute(input, ctx) {
    const users = (toList(input.assigneeUsers) ?? []).map((v) => ({
      type: "USER",
      id: /^\d+$/.test(v) ? Number(v) : v,
    }));
    const teams = (toIdList(input.assigneeTeamIds, "assigneeTeamIds") ?? []).map((id) => ({
      type: "TEAM",
      id,
    }));
    return await new MaintainXClient(ctx).entity(
      `/workorders/${encodeId(input.workOrderId)}`,
      "workOrder",
      {
        method: "PATCH",
        organizationId: input.organizationId,
        body: compact({
          title: input.title,
          description: input.description,
          priority: input.priority,
          assetId: input.assetId,
          locationId: input.locationId,
          dueDate: input.dueDate,
          startDate: input.startDate,
          estimatedTime: input.estimatedTime,
          categories: toList(input.categories),
          assignees: [...users, ...teams],
          vendorIds: toIdList(input.vendorIds, "vendorIds"),
          externalId: input.externalId,
          extraFields: asOptionalJson(input.extraFields, "extraFields"),
        }),
      },
    );
  },
};

export default workorderUpdate;
