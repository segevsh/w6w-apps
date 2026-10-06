import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, ProductiveClient, toObject } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Create a deal or budget (`POST /deals`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  name: string;
  companyId: number;
  dealTypeId?: number;
  budget?: boolean;
  dealStatusId?: number;
  responsibleId?: number;
  date?: string;
  endDate?: string;
  currency?: string;
  probability?: number;
  purchaseOrderNumber?: string;
  projectId?: number;
  note?: string;
  customFields?: unknown;
}

const dealCreate: ActionDefinition<Input> = {
  key: "deal-create",
  type: "perform",
  resource: "deal",
  title: "Create Deal or Budget",
  description: "Create a deal or budget (`POST /deals`).",
  idempotent: false,
  params: [
    { "key": "name", "label": "Name", "type": "string", "required": true },
    { "key": "companyId", "label": "Company ID", "type": "number", "required": true },
    {
      "key": "dealTypeId",
      "label": "Deal type",
      "type": "number",
      "hint":
        "Send 2 for a client deal; 1 is internal and the vendor forces it onto your internal company, which then fails validation for a client company.",
    },
    {
      "key": "budget",
      "label": "Budget",
      "type": "boolean",
      "hint": "true creates a production budget, false a sales deal.",
    },
    {
      "key": "dealStatusId",
      "label": "Deal status ID",
      "type": "number",
      "hint": "Pipeline stage.",
    },
    { "key": "responsibleId", "label": "Responsible person ID", "type": "number" },
    { "key": "date", "label": "Date", "type": "date" },
    { "key": "endDate", "label": "End date", "type": "date" },
    { "key": "currency", "label": "Currency", "type": "string", "hint": "ISO currency code." },
    { "key": "probability", "label": "Probability", "type": "number", "hint": "Win probability." },
    { "key": "purchaseOrderNumber", "label": "Purchase order number", "type": "string" },
    { "key": "projectId", "label": "Project ID", "type": "number" },
    { "key": "note", "label": "Note", "type": "text" },
    {
      "key": "customFields",
      "label": "Custom fields",
      "type": "json",
      "hint": "JSON object of custom field values, keyed by custom field id.",
    },
  ],
  output: resourceOutput("Deal"),

  async execute(input, ctx) {
    const attrs = {
      "name": input.name,
      "company_id": input.companyId,
      "deal_type_id": input.dealTypeId,
      "budget": input.budget,
      "deal_status_id": input.dealStatusId,
      "responsible_id": input.responsibleId,
      "date": input.date,
      "end_date": input.endDate,
      "currency": input.currency,
      "probability": input.probability,
      "purchase_order_number": input.purchaseOrderNumber,
      "project_id": input.projectId,
      "note": input.note,
      "custom_fields": toObject(input.customFields, "custom fields"),
    };
    return await new ProductiveClient(ctx).one(`/deals`, {
      method: "POST",
      body: jsonApiBody("deals", attrs),
    });
  },
};

export default dealCreate;
