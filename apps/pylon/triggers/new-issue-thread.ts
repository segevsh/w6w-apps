import type { ActionDefinition } from "@w6w/types";
import issueThreadList from "../actions/issue-thread-list.ts";
import { idField, snapshotTrigger } from "../lib/snapshots.ts";

/** `GET /issues/{id}/threads` returns the issue's threads in one response (`{data: [...]}`). */
export default snapshotTrigger({
  key: "new-issue-thread",
  title: "New Issue Thread",
  description: "The run gets each new thread opened on one issue.",
  action: issueThreadList as unknown as ActionDefinition,
  paged: false,
  params: [{
    key: "id",
    label: "Issue ID or number",
    type: "string",
    required: true,
  }],
  input: (params) => ({ id: params.id }),
  items: (result) => (result as { threads?: unknown[] }).threads ?? [],
  idOf: idField,
  output: [
    { key: "id", type: "string", label: "Thread ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "source", type: "string", label: "Source" },
    { key: "channel_id", type: "string", label: "Channel ID" },
  ],
  sample: {
    id: "thr_1",
    issue_id: "iss_1",
    name: "Slack thread",
    source: "slack",
    channel_id: "C1",
  },
});
