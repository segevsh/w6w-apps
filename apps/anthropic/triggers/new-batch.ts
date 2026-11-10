import { pollFromListAction } from "../../_shared/poll/mod.ts";
import batchList from "../actions/batch-list.ts";

export default pollFromListAction({
  key: "new-batch",
  title: "New Message Batch",
  description: "The run gets each newly created Message Batch.",
  action: batchList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Batch ID" },
    { key: "processing_status", type: "string", label: "Processing status" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "request_counts", type: "object", label: "Request counts" },
  ],
  sample: {
    id: "msgbatch_01",
    type: "message_batch",
    processing_status: "in_progress",
    created_at: "2026-11-09T10:00:00Z",
    request_counts: {
      processing: 2,
      succeeded: 0,
      errored: 0,
      canceled: 0,
      expired: 0,
    },
  },
  maxPages: 1,
});
