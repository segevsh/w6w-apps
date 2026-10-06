import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { CONTACT_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by ID.",
  params: [
    { key: "id", label: "Contact ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { contact(id: $id) { ${CONTACT_FIELDS} } }`,
      { id: input.id },
    );
    return data.contact;
  },
};

export default contactGet;
