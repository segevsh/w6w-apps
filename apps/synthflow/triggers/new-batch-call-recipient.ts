import type { Param } from "@w6w/types";
import batchCallListRecipients from "../actions/batch-call-list-recipients.ts";
import { readOffsetPages, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c): `GET /calls/batch/{batch_call_id}/tasks` takes `limit` (1-100)/`offset`/`status` and documents no sort
 * (https://docs.synthflow.ai/openapi.json, verified 2026-11-10), so the list is read whole (up to 10 pages
 * of 100; a larger list is refused with an error, not truncated) and only added rows are events.
 */
export default snapshotTrigger<{ batch_call_id: string }>({
  key: "new-batch-call-recipient",
  title: "New Batch Call Recipient",
  description: "The run gets each recipient newly added to the selected batch call.",
  params: (batchCallListRecipients.params ?? []).filter((p) =>
    p.key === "batch_call_id"
  ) as Param[],
  output: [
    { key: "task_id", type: "string", label: "Recipient task ID" },
    { key: "to_phone_number", type: "string", label: "Phone number" },
    { key: "lead_name", type: "string", label: "Lead name" },
    { key: "status", type: "string", label: "Dispatch status" },
  ],
  sample: {
    task_id: "task-1",
    to_phone_number: "+14155552671",
    lead_name: "Ada Lovelace",
    status: "pending",
  },
  rows: (p, ctx) =>
    readOffsetPages("new-batch-call-recipient", batchCallListRecipients, {
      batch_call_id: p.batch_call_id,
    }, ctx),
  idOf: (r) => String(r.task_id ?? ""),
});
