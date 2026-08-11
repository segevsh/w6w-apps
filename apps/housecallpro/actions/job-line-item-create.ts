import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, HousecallClient } from "../lib/client.ts";
import { companyIdParam, lineItemKindOptions, serviceItemTypeOptions } from "../lib/params.ts";

/**
 * `POST /jobs/{job_id}/line_items` — add one line item to a job.
 *
 * This is the single endpoint in the whole reference that carries a
 * rate-limiting note, and it is worth repeating rather than burying: "This is a
 * rate limited request. If you intend to create multiple line items for the same
 * job use Bulk update a job's line items request." No ceiling or window is
 * published, so the only safe reading is that a loop over this action is the
 * wrong shape.
 *
 * `kind` excludes `tax`: the 2025-10-20 changelog removed it from every
 * line-item enum as "not accepted".
 */
interface Input {
  jobId: string;
  name: string;
  description?: string;
  unitPrice?: number;
  quantity?: number;
  unitCost?: number;
  kind?: string;
  taxable?: boolean;
  serviceItemId?: string;
  serviceItemType?: string;
  companyId?: string;
}

const jobLineItemCreate: ActionDefinition<Input> = {
  key: "job-line-item-create",
  type: "perform",
  resource: "job",
  title: "Add Job Line Item",
  description:
    "Add one line item to a job. Housecall Pro rate-limits this endpoint specifically — to add " +
    "several items to one job, use its bulk update instead of calling this in a loop.",
  // No dedupe key: a retry adds a second identical line and changes the job total.
  idempotent: false,
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "unitPrice",
      label: "Unit price (cents)",
      type: "number",
      hint: "Selling price of one unit, in cents. 1999 is $19.99.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      hint: "May be fractional to two decimal places.",
    },
    {
      key: "unitCost",
      label: "Unit cost (cents)",
      type: "number",
      hint: "Direct cost to the company of one unit, in cents. Used for job costing.",
    },
    { key: "kind", label: "Kind", type: "select", options: lineItemKindOptions },
    { key: "taxable", label: "Taxable", type: "boolean" },
    { key: "serviceItemId", label: "Service item ID", type: "string" },
    {
      key: "serviceItemType",
      label: "Service item type",
      type: "select",
      options: serviceItemTypeOptions,
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Line item ID" },
    { key: "amount", type: "number", label: "Amount (cents)" },
    { key: "order_index", type: "number", label: "Order index" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}/line_items`, {
      method: "POST",
      companyId: input.companyId,
      body: compact({
        name: input.name,
        description: input.description,
        unit_price: input.unitPrice,
        quantity: input.quantity,
        unit_cost: input.unitCost,
        kind: input.kind,
        taxable: input.taxable,
        service_item_id: input.serviceItemId,
        service_item_type: input.serviceItemType,
      }),
    });
  },
};

export default jobLineItemCreate;
