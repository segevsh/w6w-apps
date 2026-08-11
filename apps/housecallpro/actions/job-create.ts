import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `POST /jobs` — create a job against an existing customer and address.
 *
 * Both ids are required by the reference: a job cannot create its own customer.
 * Use Find Customers or Create Customer for the first, and the customer's
 * `addresses` array or Create Customer Address for the second.
 *
 * `schedule.anytime` has a documented companion requirement the reference states
 * inline: `anytime_start_date` (a `YYYY-MM-DD` date) is **required if `anytime`
 * is true**. It is passed through in the `schedule` JSON rather than flattened,
 * because flattening it would hide that pairing.
 */
interface Input {
  customerId: string;
  addressId: string;
  invoiceNumber?: number;
  schedule?: unknown;
  assignedEmployeeIds?: string[] | string;
  lineItems?: unknown;
  tags?: string[] | string;
  leadSource?: string;
  notes?: string;
  jobTypeId?: string;
  businessUnitId?: string;
  companyId?: string;
}

const jobCreate: ActionDefinition<Input> = {
  key: "job-create",
  type: "perform",
  resource: "job",
  title: "Create Job",
  description:
    "Create a job for an existing customer and address. Line-item prices are integers in cents.",
  // The endpoint accepts no idempotency key, and `invoice_number` is the only
  // unique field — it is optional and auto-assigned when omitted, so a retry
  // creates a second job.
  idempotent: false,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    {
      key: "addressId",
      label: "Address ID",
      type: "string",
      required: true,
      hint: "From the customer's `addresses` array, or from Create Customer Address.",
    },
    {
      key: "invoiceNumber",
      label: "Invoice number",
      type: "number",
      hint: "Must be unique across the company's jobs. Auto-assigned when left blank.",
    },
    {
      key: "schedule",
      label: "Schedule",
      type: "json",
      hint:
        "{scheduled_start, scheduled_end, arrival_window, anytime, anytime_start_date}. Times are " +
        "ISO-8601 (2026-03-23T15:30:00); `arrival_window` is minutes. `anytime_start_date` " +
        "(YYYY-MM-DD) is required when `anytime` is true.",
    },
    {
      key: "assignedEmployeeIds",
      label: "Assigned employee IDs",
      type: "string",
      hint: "Comma-separated employee ids.",
    },
    {
      key: "lineItems",
      label: "Line items",
      type: "json",
      hint:
        "Array of {name, description, unit_price, quantity, unit_cost, pricing_form}. Prices and " +
        "costs are in cents. When a `pricing_form` is given, `unit_price` is calculated for you.",
    },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    { key: "leadSource", label: "Lead source", type: "string" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "jobTypeId", label: "Job type ID", type: "string", hint: "From Get Job Types." },
    { key: "businessUnitId", label: "Business unit ID", type: "string" },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "work_status", type: "string", label: "Work status" },
    { key: "total_amount", type: "number", label: "Total amount (cents)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "creating job", { customerId: input.customerId });
    const jobFields = compact({
      job_type_id: input.jobTypeId,
      business_unit_id: input.businessUnitId,
    });
    return new HousecallClient(ctx).json("/jobs", {
      method: "POST",
      companyId: input.companyId,
      body: compact({
        customer_id: input.customerId,
        address_id: input.addressId,
        invoice_number: input.invoiceNumber,
        schedule: asOptionalJson<unknown>(input.schedule, "Schedule"),
        assigned_employee_ids: toList(input.assignedEmployeeIds),
        line_items: asOptionalJson<unknown[]>(input.lineItems, "Line items"),
        tags: toList(input.tags),
        lead_source: input.leadSource,
        notes: input.notes,
        job_fields: Object.keys(jobFields).length > 0 ? jobFields : undefined,
      }),
    });
  },
};

export default jobCreate;
