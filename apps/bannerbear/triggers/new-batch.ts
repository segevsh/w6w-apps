import type { ActionDefinition } from "@w6w/types";
import batchList from "../actions/batch-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-batch",
  title: "New Batch",
  description:
    "The run gets each newly submitted batch of images, polled newest-first through batch-list.",
  action: batchList as unknown as ActionDefinition,
  sample: { uid: "batch_001", created_at: "2026-11-09T10:00:00.000Z" },
});
