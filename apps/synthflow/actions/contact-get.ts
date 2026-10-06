import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Read one contact by id.",
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Contact ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "phone_number", type: "string", label: "Phone number" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/contacts/${encodeURIComponent(input.contact_id)}`,
    );
  },
};

export default contactGet;
