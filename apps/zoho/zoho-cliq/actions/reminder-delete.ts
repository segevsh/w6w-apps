import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { reminderId } from "../lib/params.ts";

interface Input {
  reminderId: string;
}

/** `DELETE /api/v2/reminders/{reminderID}` — scope `ZohoCliq.Reminders.DELETE` (or `.ALL`). */
const reminderDelete: ActionDefinition<Input, Success> = {
  key: "reminder-delete",
  type: "perform",
  resource: "reminder",
  title: "Delete Reminder",
  description: "Delete a reminder.",
  idempotent: true,
  params: [reminderId],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/reminders/${seg(input.reminderId)}`, {
      method: "DELETE",
    });
    return SUCCESS;
  },
};

export default reminderDelete;
