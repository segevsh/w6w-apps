import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, MaintainXClient, toIdList, toList } from "../lib/client.ts";
import { organizationIdParam, prioritySelect } from "../lib/params.ts";

/**
 * `POST /v1/workorders` — only `title` is required by the vendor. Assignees go
 * out as `{type, id}` pairs; the vendor accepts a numeric id, or for a user an
 * email address, in `id`.
 */
interface Input {
  title: string;
  description?: string;
  priority?: string;
  type?: string;
  assetId?: number;
  locationId?: number;
  dueDate?: string;
  startDate?: string;
  estimatedTime?: number;
  categories?: string;
  assigneeUsers?: string;
  assigneeTeamIds?: string;
  vendorIds?: string;
  requesterId?: string;
  externalId?: string;
  workOrderTemplateId?: number;
  procedureTemplateId?: number;
  extraFields?: string | Record<string, string>;
  partsUsed?: string | unknown[];
  organizationId?: number;
}

const workorderCreate: ActionDefinition<Input> = {
  key: "workorder-create",
  type: "perform",
  resource: "workorder",
  title: "Create Work Order",
  description: "Create a work order and return its id.",
  // The API takes no idempotency key: a retry creates a second work order.
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    prioritySelect(),
    {
      key: "type",
      label: "Type",
      type: "select",
      options: ["OTHER", "REACTIVE", "PREVENTIVE"].map((v) => ({ value: v, label: v })),
    },
    { key: "assetId", label: "Asset ID", type: "number" },
    { key: "locationId", label: "Location ID", type: "number" },
    { key: "dueDate", label: "Due date", type: "datetime" },
    {
      key: "startDate",
      label: "Start date",
      type: "datetime",
      hint: "Only valid when a due date is set.",
    },
    { key: "estimatedTime", label: "Estimated time (seconds)", type: "number" },
    { key: "categories", label: "Categories", type: "string", hint: "Comma-separated labels." },
    {
      key: "assigneeUsers",
      label: "Assignee users",
      type: "string",
      hint: "Comma-separated user ids or email addresses.",
    },
    { key: "assigneeTeamIds", label: "Assignee team IDs", type: "string" },
    { key: "vendorIds", label: "Vendor IDs", type: "string" },
    { key: "requesterId", label: "Requester (id or email)", type: "string" },
    { key: "externalId", label: "External ID", type: "string" },
    { key: "workOrderTemplateId", label: "Work order template ID", type: "number" },
    { key: "procedureTemplateId", label: "Procedure template ID", type: "number" },
    {
      key: "extraFields",
      label: "Custom fields (JSON)",
      type: "json",
      hint: 'Object keyed by the exact custom-field label, values as strings: {"Shift": "Night"}.',
    },
    {
      key: "partsUsed",
      label: "Parts used (JSON)",
      type: "json",
      hint: '[{"partId": 1, "quantityUsed": 2, "locationId": 3}]',
    },
    organizationIdParam,
  ],
  output: [{ key: "id", type: "number", label: "New work order id" }],

  async execute(input, ctx) {
    const users = (toList(input.assigneeUsers) ?? []).map((v) => ({
      type: "USER",
      id: /^\d+$/.test(v) ? Number(v) : v,
    }));
    const teams = (toIdList(input.assigneeTeamIds, "assigneeTeamIds") ?? []).map((id) => ({
      type: "TEAM",
      id,
    }));
    const requester = input.requesterId?.trim();
    return await new MaintainXClient(ctx).request("/workorders", {
      method: "POST",
      organizationId: input.organizationId,
      body: compact({
        title: input.title,
        description: input.description,
        priority: input.priority,
        type: input.type,
        assetId: input.assetId,
        locationId: input.locationId,
        dueDate: input.dueDate,
        startDate: input.startDate,
        estimatedTime: input.estimatedTime,
        categories: toList(input.categories),
        assignees: [...users, ...teams],
        vendorIds: toIdList(input.vendorIds, "vendorIds"),
        requesterId: requester && /^\d+$/.test(requester) ? Number(requester) : requester,
        externalId: input.externalId,
        workOrderTemplateId: input.workOrderTemplateId,
        procedureTemplateId: input.procedureTemplateId,
        extraFields: asOptionalJson(input.extraFields, "extraFields"),
        partsUsed: asOptionalJson(input.partsUsed, "partsUsed"),
      }),
    });
  },
};

export default workorderCreate;
