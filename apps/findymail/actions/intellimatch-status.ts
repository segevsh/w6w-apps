import type { ActionDefinition } from "@w6w/types";
import { FindymailClient } from "../lib/client.ts";

interface Input {
  hash: string;
}

const intellimatchStatus: ActionDefinition<Input> = {
  key: "intellimatch-status",
  type: "read",
  resource: "intellimatch",
  title: "Intellimatch Status",
  description:
    "Poll an Intellimatch task. `status` is `success`, `processing`, `pending`, `failed` or `not_found`; processing carries progress counts.",
  params: [{
    "key": "hash",
    "label": "Task hash",
    "type": "string",
    "required": true,
    "hint": "The hash Intellimatch Search returned.",
  }],
  output: [
    { "key": "status", "type": "string", "label": "Status" },
    { "key": "progress", "type": "number", "label": "Progress %" },
    { "key": "total_jobs", "type": "number", "label": "Total jobs" },
    { "key": "processed_jobs", "type": "number", "label": "Processed jobs" },
    { "key": "pending_jobs", "type": "number", "label": "Pending jobs" },
    { "key": "failed_jobs", "type": "number", "label": "Failed jobs" },
  ],

  async execute(input, ctx) {
    return await new FindymailClient(ctx).request("GET", "/api/intellimatch/status", {
      query: { hash: input.hash },
    });
  },
};

export default intellimatchStatus;
