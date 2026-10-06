import type { ActionDefinition } from "@w6w/types";
import { SalesmateClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a contact by id.",
  params: [idParam("contactId", "Contact ID")],
  output: [
    { key: "id", type: "number", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    const data = await new SalesmateClient(ctx).request<Record<string, unknown>>(
      `/contact/v4/${input.contactId}`,
    );
    return data ?? {};
  },
};

export default contactGet;
