import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/** `GET /issues/{id}/threads` — `{data: [{id, issue_id, name, source, channel_id, thread_id}]}`. */
const issueThreadList: ActionDefinition<Input> = {
  key: "issue-thread-list",
  type: "read",
  resource: "message",
  title: "List Issue Threads",
  description:
    "List an issue's threads. A thread's `id` is what Post Internal Note takes as its internal thread.",
  params: [idParam("Issue ID or number")],
  output: [{ key: "threads", type: "array", label: "Threads (id, name, source, channel_id)" }],

  async execute(input, ctx) {
    const { items } = await new PylonClient(ctx).list("GET", `/issues/${seg(input.id)}/threads`);
    return { threads: items };
  },
};

export default issueThreadList;
