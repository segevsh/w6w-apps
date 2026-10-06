import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Delete a contact (contactDelete).",
  idempotent: true,
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, { id: string }>>(
      `mutation($id: ID!) { contactDelete(id: $id) { id } }`,
      { id: input.id },
    );
    return data.contactDelete;
  },
};

export default contactDelete;
