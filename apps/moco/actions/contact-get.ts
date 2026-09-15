import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

/** `GET /contacts/people/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact person by ID, including its `info` field.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "work_email", type: "string", label: "Work email" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/contacts/people/${input.contactId}`);
  },
};

export default contactGet;
