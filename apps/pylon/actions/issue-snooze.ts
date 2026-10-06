import type { ActionDefinition } from "@w6w/types";
import { PylonClient, seg } from "../lib/client.ts";
import { idParam, ISSUE_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
  snoozeUntil: string;
}

/** `POST /issues/{id}/snooze` — `snooze_until` is required (RFC3339). */
const issueSnooze: ActionDefinition<Input> = {
  key: "issue-snooze",
  type: "perform",
  resource: "issue",
  title: "Snooze Issue",
  description: "Snooze an issue until a date and time.",
  idempotent: true,
  params: [
    idParam("Issue ID or number"),
    {
      key: "snoozeUntil",
      label: "Snooze until",
      type: "datetime",
      required: true,
      hint: "RFC3339.",
    },
  ],
  output: ISSUE_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("POST", `/issues/${seg(input.id)}/snooze`, {
      body: { snooze_until: input.snoozeUntil },
    });
  },
};

export default issueSnooze;
