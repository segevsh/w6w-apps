import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `GET /v1.0/tasks?leadId={leadId}` — every task on a lead.
 *
 * Returns both open and finished tasks in `taskList`; each entry's
 * `finishFlag` says which, so filtering is the caller's job. The caller must
 * have manage permission on the lead.
 *
 * The interesting field beyond the obvious ones is `overdueFlag`: Lofty
 * computes "past its deadline and still open" server-side, which is a
 * different question from comparing `deadline` to now — a finished-late task
 * is not overdue.
 */
interface Input {
  leadId: number;
}

const action: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description: "List every task attached to a lead, open and finished (GET /v1.0/tasks).",
  params: [leadIdParam],
  output: [{ key: "taskList", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new LoftyClient(ctx).request("/tasks", { query: { leadId: input.leadId } });
  },
};

export default action;
