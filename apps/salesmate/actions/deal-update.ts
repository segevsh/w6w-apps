import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, SalesmateClient } from "../lib/client.ts";
import { currencyParam, customFieldsParam, idParam, ownerParam, tagsParam } from "../lib/params.ts";

interface Input {
  dealId: number;
  title: string;
  primaryContact: number;
  pipeline: string;
  stage: string;
  status: string;
  primaryCompany?: number;
  dealValue?: number;
  estimatedCloseDate?: string;
  source?: string;
  priority?: string;
  description?: string;
  followers?: unknown;
  owner: number;
  currency?: string;
  tags?: string;
  customFields?: unknown;
}

const dealUpdate: ActionDefinition<Input> = {
  key: "deal-update",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  description:
    "Update a deal. Salesmate's update takes the full required field set, not just the changes.",
  idempotent: true,
  params: [
    idParam("dealId", "Deal ID"),
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "primaryContact",
      label: "Primary contact ID",
      type: "number",
      required: true,
      hint: "Existing contact the deal is with.",
    },
    {
      key: "pipeline",
      label: "Pipeline",
      type: "string",
      required: true,
      hint: "Pipeline name, e.g. Sales.",
    },
    {
      key: "stage",
      label: "Stage",
      type: "string",
      required: true,
      hint: "Stage name within the pipeline.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      hint: "Allowed values per the reference: Open, Close, Lost.",
      options: [{ value: "Open", label: "Open" }, { value: "Close", label: "Won (Close)" }, {
        value: "Lost",
        label: "Lost",
      }],
    },
    { key: "primaryCompany", label: "Primary company ID", type: "number" },
    { key: "dealValue", label: "Deal value", type: "number" },
    {
      key: "estimatedCloseDate",
      label: "Estimated close date",
      type: "string",
      hint: "ISO 8601 date-time, e.g. 2024-11-29T09:34:00Z.",
    },
    { key: "source", label: "Source", type: "string", advanced: true },
    {
      key: "priority",
      label: "Priority",
      type: "string",
      advanced: true,
      hint: "e.g. High, Medium, Low.",
    },
    { key: "description", label: "Description", type: "text", advanced: true },
    {
      key: "followers",
      label: "Followers",
      type: "json",
      advanced: true,
      hint: 'Array such as [{"userId":1},{"contactId":3}].',
    },
    ownerParam(true),
    currencyParam,
    tagsParam,
    customFieldsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Deal ID" },
    { key: "title", type: "string", label: "Title" },
  ],

  async execute(input, ctx) {
    const { dealId: _id, customFields: custom, ...fields } = input as Input & { dealId?: number };
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/deal/v4/${input.dealId}`,
      {
        method: "PUT",
        body: { ...customFields(custom), ...compact(fields) },
      },
    );
    return data ?? {};
  },
};

export default dealUpdate;
