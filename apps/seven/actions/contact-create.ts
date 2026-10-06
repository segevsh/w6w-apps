import type { ActionDefinition } from "@w6w/types";
import { jsonObject, SevenClient } from "../lib/client.ts";

/** `POST /api/contacts` — create a contact; answers the created contact object. */
interface Input {
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

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create Contact",
  description:
    "Create a contact. Group membership is not set here; the vendor's `groups` array replaces the whole membership list and is not covered.",
  idempotent: false,
  params: [
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
    const { custom_properties, ...fields } = input;
    return new SevenClient(ctx).request("POST", "/contacts", {
      form: { ...jsonObject(custom_properties), ...fields },
    });
  },
};

export default contactCreate;
