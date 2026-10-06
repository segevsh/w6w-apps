import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const quoteDuplicate: ActionDefinition<Input> = {
  key: "quote-duplicate",
  type: "perform",
  resource: "quote",
  title: "Duplicate Quote",
  description:
    "Create a copy of a quote (`quoteDuplicate`). Not idempotent: every call makes another copy.",
  idempotent: false,
  params: [
    { key: "id", label: "Quote ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "New ID" },
    { key: "visualId", type: "string", label: "Quote #" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<{ quoteDuplicate: unknown }>(
      `mutation($id: ID!) { quoteDuplicate(id: $id) { ${ORDER_FIELDS} } }`,
      { id: input.id },
    );
    return data.quoteDuplicate;
  },
};

export default quoteDuplicate;
