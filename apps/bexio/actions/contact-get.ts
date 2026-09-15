import type { ActionDefinition } from "@w6w/types";
import { BexioClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "nr", type: "string", label: "Contact number" },
    { key: "name_1", type: "string", label: "Name / company" },
  ],

  execute(input, ctx) {
    return new BexioClient(ctx).get(`/2.0/contact/${encodeURIComponent(input.contactId)}`);
  },
};

export default contactGet;
