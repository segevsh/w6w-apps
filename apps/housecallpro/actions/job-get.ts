import type { ActionDefinition } from "@w6w/types";
import { encodeId, HousecallClient, toList } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/** `GET /jobs/{id}` — one job, with its customer, address, schedule and totals. */
interface Input {
  jobId: string;
  expand?: string[] | string;
  companyId?: string;
}

const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description:
    "Fetch one job by id. Amounts are integers in cents. `recurrence_id` and `recurrence_status` " +
    "are null unless the job belongs to a recurring series.",
  params: [
    { key: "jobId", label: "Job ID", type: "string", required: true },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "attachments", label: "Attachments" },
        { value: "appointments", label: "Appointments" },
      ],
      hint: "Appointments are absent from `schedule` unless expanded.",
    },
    companyIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Job ID" },
    { key: "invoice_number", type: "string", label: "Invoice number" },
    { key: "work_status", type: "string", label: "Work status" },
    { key: "schedule", type: "object", label: "Schedule" },
    { key: "total_amount", type: "number", label: "Total amount (cents)" },
    { key: "outstanding_balance", type: "number", label: "Outstanding balance (cents)" },
    { key: "assigned_employees", type: "array", label: "Assigned employees" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json(`/jobs/${encodeId(input.jobId)}`, {
      companyId: input.companyId,
      query: { expand: toList(input.expand) },
    });
  },
};

export default jobGet;
