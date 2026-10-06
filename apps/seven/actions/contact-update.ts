import type { ActionDefinition } from "@w6w/types";
import { encodeId, jsonObject, SevenClient } from "../lib/client.ts";

/** `PATCH /api/contacts/:id` — change one or more properties; answers the updated contact. */
interface Input {
  id: number;
  firstname?: string;
  lastname?: string;
  mobile_number?: string;
  home_number?: string;
  email?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  birthday?: string;
  notes?: string;
  avatar?: string;
  custom_properties?: unknown;
}

const contactUpdate: ActionDefinition<Input> = {
  key: "contact-update",
  type: "perform",
  resource: "contact",
  title: "Update Contact",
  description: "Change one or more properties of a contact. Unset fields are left as they are.",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "number", required: true },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "mobile_number", label: "Mobile number", type: "string" },
    { key: "home_number", label: "Home number", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "address", label: "Address", type: "string" },
    { key: "postal_code", label: "Postal code", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "birthday", label: "Birthday", type: "string", hint: "YYYY-MM-DD" },
    { key: "notes", label: "Notes", type: "text" },
    { key: "avatar", label: "Avatar URL", type: "string" },
    {
      key: "custom_properties",
      label: "Custom properties",
      type: "json",
      hint:
        'JSON object keyed by the unique name of each custom contact property, e.g. {"plan": "pro"}.',
    },
  ],
  output: [
    { key: "id", type: "number", label: "Contact id" },
    { key: "properties", type: "object", label: "The stored properties" },
  ],

  execute(input, ctx) {
    const { id, custom_properties, ...fields } = input;
    return new SevenClient(ctx).request("PATCH", `/contacts/${encodeId(id)}`, {
      form: { ...jsonObject(custom_properties), ...fields },
    });
  },
};

export default contactUpdate;
