import type { ActionDefinition } from "@w6w/types";
import { seg, SuperchatClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  handles?: unknown[];
  customAttributes?: unknown[];
}

/** Update a contact's name, gender, handles or custom attributes. The API's PATCH requires first name, last name and gender on every call (a missing one would be read as a clear), so this action reads the contact first and re-sends the values you did not change. */
const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description:
    "Update a contact's name, gender, handles or custom attributes. The API's PATCH requires first name, last name and gender on every call (a missing one would be read as a clear), so this action reads the contact first and re-sends the values you did not change.",
  idempotent: true,
  params: [
    { "key": "contactId", "label": "Contact ID", "type": "string", "required": true },
    { "key": "firstName", "label": "First name", "type": "string" },
    { "key": "lastName", "label": "Last name", "type": "string" },
    {
      "key": "gender",
      "label": "Gender",
      "type": "select",
      "options": [{ "value": "male", "label": "Male" }, { "value": "female", "label": "Female" }, {
        "value": "diverse",
        "label": "Diverse",
      }, { "value": "unknown", "label": "Unknown" }],
    },
    {
      "key": "handles",
      "label": "Handles",
      "type": "json",
      "hint":
        'FULL list of handles that should remain: [{"id": "<existing id>"|null, "type": "mail"|"phone", "value": "..."}]. Handles you leave out are removed. Omit to leave handles alone.',
    },
    {
      "key": "customAttributes",
      "label": "Custom attributes",
      "type": "json",
      "hint":
        'FULL list of [{"id","value"}] that should remain on the contact. Omit to leave them alone.',
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Contact ID" },
    { "key": "handles", "type": "array", "label": "Contact handles" },
  ],

  async execute(input, ctx) {
    const client = new SuperchatClient(ctx);
    const id = seg(input.contactId);
    const current = await client.request<
      { first_name: string | null; last_name: string | null; gender: string | null }
    >(`/contacts/${id}`);
    return client.request(`/contacts/${id}`, {
      method: "PATCH",
      body: {
        first_name: input.firstName ?? current.first_name,
        last_name: input.lastName ?? current.last_name,
        gender: input.gender || current.gender,
        ...(input.handles ? { handles: input.handles } : {}),
        ...(input.customAttributes ? { custom_attributes: input.customAttributes } : {}),
      },
    });
  },
};

export default contactUpdate;
