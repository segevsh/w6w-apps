import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, SynthflowClient } from "../lib/client.ts";

interface Input {
  name?: string;
  model_id?: string;
  from_phone_number?: string;
  batch_call_id?: string;
  trigger_timestamp?: number;
  reserved_concurrency?: number;
  call_time_window?: unknown;
  tasks: unknown;
}

const batchCallCreate: ActionDefinition<Input> = {
  key: "batch-call-create",
  type: "perform",
  resource: "batch-call",
  title: "Create Batch Call",
  description: "Create a batch of outbound calls, or append recipients to an existing batch.",
  idempotent: false,
  params: [
    { key: "name", label: "Batch name", type: "string" },
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      hint: "Required when creating a new batch; ignored when appending.",
    },
    {
      key: "from_phone_number",
      label: "Caller ID",
      type: "string",
      hint: "Required when creating a new batch; ignored when appending.",
    },
    {
      key: "batch_call_id",
      label: "Existing batch ID",
      type: "string",
      hint: "Set to append recipients to an existing batch instead of creating one.",
    },
    {
      key: "trigger_timestamp",
      label: "Start at (ms since epoch)",
      type: "number",
      hint: "Omit to start dialing immediately.",
    },
    {
      key: "reserved_concurrency",
      label: "Reserved concurrency",
      type: "number",
      hint: "Call slots held back for calls outside this batch.",
    },
    {
      key: "call_time_window",
      label: "Call time window",
      type: "json",
      hint: "{ enable, weekly_hours } evaluated in the agent's timezone.",
    },
    {
      key: "tasks",
      label: "Recipients",
      type: "json",
      required: true,
      hint:
        "Array of 1-10000 objects: { to_phone_number (required), id, lead_name, lead_email, custom_variables, override_model_id }.",
    },
  ],
  output: [{ key: "batch_call_id", type: "string", label: "Batch ID" }, {
    key: "status",
    type: "string",
    label: "Batch status",
  }, { key: "total_task_count", type: "number", label: "Recipients stored" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>("/calls/batch", {
      method: "POST",
      body: compact({
        name: input.name,
        model_id: input.model_id,
        from_phone_number: input.from_phone_number,
        batch_call_id: input.batch_call_id,
        trigger_timestamp: input.trigger_timestamp,
        reserved_concurrency: input.reserved_concurrency,
        call_time_window: asOptionalJson(input.call_time_window, "call_time_window"),
        tasks: asOptionalJson(input.tasks, "tasks"),
      }),
    });
  },
};

export default batchCallCreate;
