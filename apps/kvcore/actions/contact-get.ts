import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
}

/** `GET /v2/public/contact/{contact_id}` — a single contact's full record. */
const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID.",
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "status", type: "number", label: "Lead status" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/contact/${encodeURIComponent(input.contact_id)}`);
  },
};

export default contactGet;
