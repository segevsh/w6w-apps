import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

interface Input {
  firstName?: string;
  lastName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  customAttributes?: unknown[];
}

/** Create a contact. At least one email address or phone number (E.164) is required, because the API requires a handle. */
const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. At least one email address or phone number (E.164) is required, because the API requires a handle.",
  idempotent: false,
  params: [
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
    { "key": "email", "label": "Email", "type": "string" },
    {
      "key": "phone",
      "label": "Phone",
      "type": "string",
      "hint": "E.164 format, e.g. +491701234567.",
    },
    {
      "key": "customAttributes",
      "label": "Custom attributes",
      "type": "json",
      "hint":
        'Array of {"id": "<attribute id>", "value": ...}. Get ids from List Custom Attributes.',
    },
  ],
  output: [
    { "key": "id", "type": "string", "label": "Contact ID" },
    { "key": "handles", "type": "array", "label": "Contact handles" },
  ],

  execute(input, ctx) {
    const handles: Array<{ id: null; type: "mail" | "phone"; value: string }> = [];
    if (input.email) handles.push({ id: null, type: "mail", value: input.email });
    if (input.phone) handles.push({ id: null, type: "phone", value: input.phone });
    if (handles.length === 0) {
      throw new Error("Superchat: a contact needs an email or a phone number");
    }
    return new SuperchatClient(ctx).request("/contacts", {
      method: "POST",
      body: {
        first_name: input.firstName ?? null,
        last_name: input.lastName ?? null,
        gender: input.gender || null,
        handles,
        ...(input.customAttributes ? { custom_attributes: input.customAttributes } : {}),
      },
    });
  },
};

export default contactCreate;
