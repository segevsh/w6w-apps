import batchCallList from "../actions/batch-call-list.ts";
import { readOffsetPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c): `GET /calls/batch` takes `limit` (1-100)/`offset` and documents no sort or filter
 * (https://docs.synthflow.ai/openapi.json, verified 2026-11-10), so the list is read whole (up to 10 pages
 * of 100; a larger list is refused with an error, not truncated) and only added rows are events.
 */
export default snapshotTrigger({
  key: "new-batch-call",
  title: "New Batch Call",
  description: "The run gets each batch call newly created in the workspace.",
  output: [
    { key: "batch_call_id", type: "string", label: "Batch ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "model_id", type: "string", label: "Agent ID" },
  ],
  sample: {
    batch_call_id: "batch-1",
    name: "November follow-ups",
    status: "pending",
    created_at: "2026-11-09T09:00:00Z",
    model_id: "agent-1",
  },
  rows: (_p, ctx) => readOffsetPages("new-batch-call", batchCallList, {}, ctx),
  idOf: (r) => String(r.batch_call_id ?? ""),
});
