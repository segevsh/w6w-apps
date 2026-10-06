import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, toArray, toObject } from "../lib/client.ts";

/**
 * `POST /api/v2/opportunities` — Create a sales opportunity on a company, in a pipe.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  company_id: number;
  name: string;
  amount?: number;
  probability?: number;
  comments?: string;
  pipe_name?: string;
  pipe_step_name?: string;
  due_date_ts?: number;
  pipe_step_date_ts?: number;
  employees?: string | Record<string, unknown> | unknown[];
  business_manager_email?: string;
  custom_fields?: string | Record<string, unknown> | unknown[];
}

const opportunityCreate: ActionDefinition<Input> = {
  key: "opportunity-create",
  type: "perform",
  resource: "opportunity",
  title: "Create Opportunity",
  description: "Create a sales opportunity on a company, in a pipe.",
  idempotent: false,
  params: [
    { key: "company_id", label: "Company ID", type: "number", required: true, hint: "Company id." },
    { key: "name", label: "Name", type: "string", required: true, hint: "Opportunity name." },
    { key: "amount", label: "Amount", type: "number", hint: "Expected amount." },
    {
      key: "probability",
      label: "Probability",
      type: "number",
      hint: "Win probability in percent.",
    },
    { key: "comments", label: "Comments", type: "text", hint: "Comments." },
    { key: "pipe_name", label: "Pipe name", type: "string", hint: "Pipe (see the pipes list)." },
    {
      key: "pipe_step_name",
      label: "Pipe step name",
      type: "string",
      hint: "Step within the pipe.",
    },
    {
      key: "due_date_ts",
      label: "Due date (Unix seconds)",
      type: "number",
      hint: "Due date as a Unix timestamp in seconds.",
    },
    {
      key: "pipe_step_date_ts",
      label: "Step date (Unix seconds)",
      type: "number",
      hint: "Step date as a Unix timestamp in seconds.",
    },
    {
      key: "employees",
      label: "Employees",
      type: "json",
      hint:
        "JSON array of `{employee_firstname, employee_lastname, employee_email, employee_phone, employee_cellphone}`.",
    },
    {
      key: "business_manager_email",
      label: "Business manager email",
      type: "string",
      hint: "Manager email.",
    },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      hint: 'JSON object `{"customFieldName": value}`.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Opportunity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "amount", type: "number", label: "Amount" },
    { key: "probability", type: "number", label: "Probability" },
    { key: "pipe_name", type: "string", label: "Pipe" },
    { key: "pipe_step_name", type: "string", label: "Pipe step" },
    { key: "is_win", type: "boolean", label: "Is won" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/opportunities`, {
      method: "POST",
      body: compact({
        "company_id": input.company_id,
        "name": input.name,
        "amount": input.amount,
        "probability": input.probability,
        "comments": input.comments,
        "pipe_name": input.pipe_name,
        "pipe_step_name": input.pipe_step_name,
        "due_date_ts": input.due_date_ts,
        "pipe_step_date_ts": input.pipe_step_date_ts,
        "employees": toArray(input.employees, "employees"),
        "business_manager_email": input.business_manager_email,
        "custom_fields": toObject(input.custom_fields, "custom_fields"),
      }),
    });
  },
};

export default opportunityCreate;
