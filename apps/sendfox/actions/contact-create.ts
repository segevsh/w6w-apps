import type { ActionDefinition } from "@w6w/types";
import { compact, SendfoxClient, toIdList } from "../lib/client.ts";

/**
 * `POST /contacts` — create a contact.
 *
 * `email` is the only required field. The response is the bare `Contact`.
 *
 * ## Membership and fields are set here, not separately
 *
 * `lists` takes list **ids** and adds the contact to each; `contact_fields`
 * takes `{name, value}` pairs whose `name` is the machine slug of a custom field
 * (see the account's contact fields in SendFox). Both are optional.
 *
 * ## Not idempotent
 *
 * A retry of a create that actually succeeded the first time does not return the
 * existing contact — SendFox rejects a duplicate address — so this is declared
 * `idempotent: false` rather than letting a retried step fail on a contact it
 * just made.
 *
 * `402` is a real response here and means the account's contact limit is full,
 * not that the request was wrong.
 */
interface Input {
  email: string;
  firstName?: string;
  lastName?: string;
  ipAddress?: string;
  lists?: number[];
  contactFields?: Array<{ name?: string; value?: string }>;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description: "Create a contact, optionally adding it to lists and setting custom fields.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "reader@example.com",
      hint: "The address to create. SendFox rejects a duplicate.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    {
      key: "ipAddress",
      label: "Signup IP address",
      type: "string",
      hint: "The address the contact signed up from, if your workflow captured it.",
    },
    {
      key: "lists",
      label: "Lists",
      type: "array",
      item: { type: "number", placeholder: "42" },
      hint: "List ids to add the contact to. The contact is added to every one of them.",
    },
    {
      key: "contactFields",
      label: "Custom fields",
      type: "array",
      item: {
        type: "object",
        fields: [
          { key: "name", label: "Field name", type: "string", placeholder: "company" },
          { key: "value", label: "Value", type: "string" },
        ],
      },
      hint: "Pairs of a custom field's machine name and its value for this contact.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "created_at", type: "string", label: "Created at" },
  ],

  execute(input, ctx) {
    return new SendfoxClient(ctx).json("/contacts", {
      method: "POST",
      body: compact({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        ip_address: input.ipAddress,
        lists: toIdList(input.lists),
        contact_fields: input.contactFields,
      }),
    });
  },
};

export default contactCreate;
