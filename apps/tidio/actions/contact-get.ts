import type { ActionDefinition } from "@w6w/types";
import { call, cleanContact, encodeId } from "../lib/client.ts";
import { str } from "../lib/params.ts";

/** `GET /contacts/{contactId}`. */
type Input = { contact_id: string };

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by its Tidio ID, including custom properties.",
  params: [str("contact_id", "Contact ID", { required: true, hint: "The contact's UUID." })],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "distinct_id", type: "string", label: "ID in your own system" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "properties", type: "array", label: "Custom properties [{name, value}]" },
  ],
  async execute(input, ctx) {
    return cleanContact(await call(ctx, "GET", `/contacts/${encodeId(input.contact_id)}`));
  },
};

export default contactGet;
