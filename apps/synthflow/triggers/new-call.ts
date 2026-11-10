import { sinceTrigger } from "../lib/triggers.ts";
import callList from "../actions/call-list.ts";
import { PAGE_SIZE } from "../lib/triggers.ts";

interface Call {
  call_id?: string;
  start_time?: string;
}

// Synthflow: GET /calls takes `from_date` ("Begin timestamp (milliseconds since epoch) of the call")
// plus `limit`/`offset`, and returns `pagination.total_records`; call `start_time` is "milliseconds
// since epoch" (https://docs.synthflow.ai/openapi.json, verified 2026-11-09). The list has no
// documented sort order, so every page of the window is read (since-filter shape, brief 9.1 b).
export default sinceTrigger<Call, { model_id: string }>({
  key: "new-call",
  title: "New Call",
  description: "The run gets each new call (inbound or outbound) handled by the selected agent.",
  params: (callList.params ?? []).filter((p) => p.key === "model_id"),
  async fetchPage(sinceMs, page, ctx, params) {
    const offset = (page - 1) * PAGE_SIZE;
    const res = await callList.execute({
      model_id: params.model_id,
      limit: PAGE_SIZE,
      offset,
      from_date: sinceMs,
    }, ctx) as { items?: Call[]; pagination?: { total_records?: number } };
    const items = res.items ?? [];
    const total = res.pagination?.total_records;
    return { items, more: typeof total === "number" ? offset + items.length < total : false };
  },
  idOf: (call) => String(call.call_id ?? ""),
  createdAtMs: (call) => {
    const ms = Number(call.start_time);
    return Number.isFinite(ms) && ms > 0 ? ms : undefined;
  },
  output: [
    { key: "call_id", type: "string", label: "Call ID" },
    { key: "model_id", type: "string", label: "Agent ID" },
    { key: "type_of_call", type: "string", label: "Inbound or outbound" },
    { key: "call_status", type: "string", label: "Call status" },
    { key: "start_time", type: "string", label: "Started (ms since epoch)" },
    { key: "duration", type: "number", label: "Duration (s)" },
    { key: "lead_phone_number", type: "string", label: "Lead phone number" },
  ],
  sample: {
    call_id: "call_101",
    model_id: "agent_1",
    type_of_call: "inbound",
    call_status: "completed",
    start_time: "1762646400000",
    duration: 64,
    lead_phone_number: "+14155552671",
  },
});
