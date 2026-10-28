import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { reminderId } from "../lib/params.ts";

interface Input {
  reminderId: string;
}

/**
 * `PUT /api/v2/reminders/{reminderID}/complete` — scope
 * `ZohoCliq.Reminders.UPDATE` (or `.ALL`). Only reminders in the caller's own
 * `mine` category can be completed.
 */
const reminderComplete: ActionDefinition<Input, Success> = {
  key: "reminder-complete",
  type: "perform",
  resource: "reminder",
  title: "Complete Reminder",
  description: "Mark one of your own reminders as complete.",
  idempotent: true,
  params: [reminderId],
  output: [{ key: "success", type: "boolean", label: "Completed" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/reminders/${seg(input.reminderId)}/complete`, {
      method: "PUT",
    });
    return SUCCESS;
  },
};

export default reminderComplete;
