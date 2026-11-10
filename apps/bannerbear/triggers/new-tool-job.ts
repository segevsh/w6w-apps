import type { ActionDefinition } from "@w6w/types";
import toolJobList from "../actions/tool-job-list.ts";
import { newestFirst } from "../lib/triggers.ts";

export default newestFirst({
  key: "new-tool-job",
  title: "New Tool Job",
  description:
    "The run gets each newly created tool job (any tool, any status), polled newest-first through tool-job-list.",
  action: toolJobList as unknown as ActionDefinition,
  sample: { uid: "job_001", tool: "remove_bg", created_at: "2026-11-09T10:00:00.000Z" },
});
