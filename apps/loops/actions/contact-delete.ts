import type { ActionDefinition } from "@w6w/types";
import { contactIdentity, LoopsClient } from "../lib/client.ts";
import { CONTACT_IDENTITY_PARAMS } from "../lib/params.ts";

/**
 * `POST /v1/contacts/delete` — verified against Loops' OpenAPI document.
 *
 * **Deleting is not unsubscribing, and for most compliance purposes it is the
 * wrong one.** A deleted contact is gone along with their event history and
 * their unsubscribe record — so if they are re-imported later, nothing
 * remembers that they opted out. `contact-update` with Subscribed off is what
 * "stop emailing this person" usually means; delete is for erasure requests.
 */
const action: ActionDefinition = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete a contact",
  description:
    "Permanently delete a contact and their history. Unsubscribing is usually what is meant.",
  idempotent: true,
  params: [
    ...CONTACT_IDENTITY_PARAMS,
    {
      key: "confirm",
      label: "I understand this cannot be undone",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. Deleting also loses the unsubscribe record, so a later re-import will " +
        "not know they opted out.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Deleted" },
    { key: "message", type: "string", label: "Message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const identity = contactIdentity(p.email, p.userId, "`contact-delete`");
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a contact cannot be undone");
    }

    ctx.log("warn", "deleting a Loops contact", { by: Object.keys(identity)[0] });

    return await new LoopsClient(ctx).request("/contacts/delete", {
      method: "POST",
      body: identity,
    });
  },
};

export default action;
