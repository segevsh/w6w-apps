import type { ActionDefinition } from "@w6w/types";
import { SynthflowClient } from "../lib/client.ts";

interface Input {
  contact_id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact.",
  idempotent: true,
  params: [
    { key: "contact_id", label: "Contact ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  async execute(input, ctx) {
    return await new SynthflowClient(ctx).data<Record<string, unknown>>(
      `/contacts/${encodeURIComponent(input.contact_id)}`,
      { method: "DELETE" },
    );
  },
};

export default contactDelete;
