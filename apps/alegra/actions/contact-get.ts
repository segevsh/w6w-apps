import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch one contact by id.",
  params: [
    {
      "key": "id",
      "label": "ID",
      "type": "string",
      "required": true,
      "hint": "Alegra ids are STRINGS (numeric-looking, or a UUID on newer accounts).",
    },
    {
      "key": "fields",
      "label": "Extra fields",
      "type": "string",
      "hint": "Comma-separated extra fields to include.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/contacts/${idPath(input.id)}`, {
      query: { fields: input.fields },
    });
  },
};

export default contactGet;
