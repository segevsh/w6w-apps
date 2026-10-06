import type { ActionDefinition } from "@w6w/types";
import { seg, ses } from "../lib/api.ts";

/**
 * DeleteContact — `DELETE /v2/email/contact-lists/{ContactListName}/contacts/{EmailAddress}`.
 * https://docs.aws.amazon.com/ses/latest/APIReference-V2/API_DeleteContact.html
 */
interface Input {
  contactListName: string;
  emailAddress: string;
}

const action: ActionDefinition<Input, Record<string, unknown>> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Remove a contact from a contact list.",
  idempotent: true,
  params: [
    { key: "contactListName", label: "Contact list", type: "string", required: true },
    { key: "emailAddress", label: "Email address", type: "string", required: true },
  ],
  output: [
    { key: "emailAddress", type: "string", label: "Address" },
    { key: "deleted", type: "boolean", label: "True when SES accepted the deletion" },
  ],

  async execute(input, ctx) {
    await ses(ctx, {
      op: "DeleteContact",
      method: "DELETE",
      path: `/v2/email/contact-lists/${seg(input.contactListName)}/contacts/${
        seg(input.emailAddress)
      }`,
    });
    return { emailAddress: input.emailAddress, deleted: true };
  },
};

export default action;
