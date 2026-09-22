import type { ActionDefinition } from "@w6w/types";
import { encodeId, StreamtimeClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /contacts/{contact_id}` — one contact. */
interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id, if it belongs to your organisation.",
  params: [
    idParam(
      "contactId",
      "Contact ID",
      "Ids come from a search over `contacts`, or from a job's contact.",
    ),
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email address" },
    { key: "companyId", type: "number", label: "Company ID" },
    { key: "contactStatus", type: "object", label: "Status — `{ id, name }`" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request(`/contacts/${encodeId(input.contactId)}`);
  },
};

export default contactGet;
