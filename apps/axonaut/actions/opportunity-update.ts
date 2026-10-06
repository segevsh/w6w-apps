import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, compact, encodeId, toObject } from "../lib/client.ts";

/**
 * `PATCH /api/v2/opportunities/{opportunityId}` — Update an opportunity; only the fields you send change.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  opportunityId: number;
  amount?: number;
  probability?: number;
  name?: string;
  comments?: string;
  pipe_step_name?: string;
  due_date_ts?: number;
  business_manager_email?: string;
  custom_fields?: string | Record<string, unknown> | unknown[];
}

const opportunityUpdate: ActionDefinition<Input> = {
  key: "opportunity-update",
  type: "perform",
  resource: "opportunity",
  title: "Update Opportunity",
  description: "Update an opportunity; only the fields you send change.",
  idempotent: true,
  params: [
    {
      key: "opportunityId",
      label: "Opportunity ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the opportunity.",
    },
    { key: "amount", label: "Amount", type: "number", hint: "Expected amount." },
    {
      key: "probability",
      label: "Probability",
      type: "number",
      hint: "Win probability in percent.",
    },
    { key: "name", label: "Name", type: "string", hint: "Opportunity name." },
    { key: "comments", label: "Comments", type: "text", hint: "Comments." },
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
    return new AxonautClient(ctx).one(`/opportunities/${encodeId(input.opportunityId)}`, {
      method: "PATCH",
      body: compact({
        "amount": input.amount,
        "probability": input.probability,
        "name": input.name,
        "comments": input.comments,
        "pipe_step_name": input.pipe_step_name,
        "due_date_ts": input.due_date_ts,
        "business_manager_email": input.business_manager_email,
        "custom_fields": toObject(input.custom_fields, "custom_fields"),
      }),
    });
  },
};

export default opportunityUpdate;
