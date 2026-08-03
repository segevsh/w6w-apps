import type { ActionDefinition } from "@w6w/types";
import { ConstantContactClient } from "../lib/client.ts";

interface Input {
  listId: string;
}

/**
 * `DELETE /v3/contact_lists/{list_id}` — **asynchronous**, unlike every other
 * DELETE in this app. It answers `202 Accepted` with an activity record, not
 * `204`, and the list is not actually gone when the call returns.
 *
 * Poll the returned `activity_id` with Get Activity Status until `state` is
 * `completed`.
 *
 * Deleting a list deletes its *membership*, not its contacts — the contacts
 * survive, they simply stop being members.
 *
 * `idempotent: true` — a repeat queues another activity that finds nothing to
 * do; the end state is the same.
 */
const deleteContactList: ActionDefinition<Input> = {
  key: "delete-contact-list",
  type: "perform",
  resource: "list",
  title: "Delete Contact List",
  description:
    "Queue a contact list for deletion. Asynchronous — poll the returned activity_id with Get Activity Status.",
  idempotent: true,
  params: [
    { key: "listId", label: "List ID", type: "string", required: true },
  ],
  output: [
    { key: "activity_id", type: "string", label: "Activity ID to poll" },
    { key: "state", type: "string", label: "Activity state" },
  ],

  execute(input, ctx) {
    const client = new ConstantContactClient(ctx);
    return client.request(`/contact_lists/${encodeURIComponent(input.listId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteContactList;
