import type { ActionDefinition } from "@w6w/types";
import { encodeId, ParseurClient } from "../lib/client.ts";
import { mailboxIdParam } from "../lib/params.ts";

/**
 * `DELETE /parser/{id}` — delete a mailbox.
 *
 * Documented as **asynchronous**: the response is an acknowledgement
 * (`{"notification_set":{"info":["Mailbox is being deleted. This can take a
 * while."]}}`), not confirmation the mailbox is already gone — see
 * `lib/client.ts`. `mailbox-list` / `mailbox-get` afterwards is the only way
 * to see whether it has actually finished.
 */
interface Input {
  mailboxId: string;
}

const mailboxDelete: ActionDefinition<Input> = {
  key: "mailbox-delete",
  type: "perform",
  resource: "mailbox",
  title: "Delete Mailbox",
  description: "Delete a mailbox by id. Deletion is asynchronous — see the action's notes.",
  idempotent: true,
  params: [mailboxIdParam],
  output: [
    { key: "mailboxId", type: "string", label: "Mailbox deleted" },
    { key: "notification_set", type: "object", label: "Vendor acknowledgement" },
  ],

  async execute(input, ctx) {
    const body = await new ParseurClient(ctx).request<{ notification_set?: unknown }>(
      `/parser/${encodeId(input.mailboxId)}`,
      { method: "DELETE" },
    );
    return { mailboxId: input.mailboxId, notification_set: body?.notification_set };
  },
};

export default mailboxDelete;
