import type { ActionDefinition } from "@w6w/types";
import { listResult, SynthflowClient } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  model_id: string;
  limit?: number;
  offset?: number;
  from_date?: number;
  to_date?: number;
  call_status?: string;
  duration_min?: number;
  duration_max?: number;
  lead_phone_number?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "search",
  resource: "call",
  title: "List Calls",
  description: "List calls placed or received by an agent, newest first, with optional filters.",
  params: [
    {
      key: "model_id",
      label: "Agent ID",
      type: "string",
      required: true,
      hint: "Calls for this agent are returned.",
    },
    limitParam,
    offsetParam,
    {
      key: "from_date",
      label: "From (ms since epoch)",
      type: "number",
      hint: "Begin timestamp of the call, milliseconds since epoch.",
    },
    {
      key: "to_date",
      label: "To (ms since epoch)",
      type: "number",
      hint: "End timestamp of the call, milliseconds since epoch.",
    },
    {
      key: "call_status",
      label: "Call status",
      type: "string",
      hint: "Status of the call, e.g. completed.",
    },
    { key: "duration_min", label: "Min duration (s)", type: "number" },
    { key: "duration_max", label: "Max duration (s)", type: "number" },
    {
      key: "lead_phone_number",
      label: "Lead phone number",
      type: "string",
      hint: "E.164 preferred.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Calls" }, {
    key: "pagination",
    type: "object",
    label: "Pagination (total_records, limit, offset)",
  }],

  async execute(input, ctx) {
    const r = await new SynthflowClient(ctx).data<Record<string, unknown>>("/calls", {
      query: {
        model_id: input.model_id,
        limit: input.limit,
        offset: input.offset,
        from_date: input.from_date,
        to_date: input.to_date,
        call_status: input.call_status,
        duration_min: input.duration_min,
        duration_max: input.duration_max,
        lead_phone_number: input.lead_phone_number,
      },
    });
    return listResult(r, "calls");
  },
};

export default callList;
