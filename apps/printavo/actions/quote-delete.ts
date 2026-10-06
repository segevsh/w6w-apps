import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";

interface Input {
  id: string;
}

const quoteDelete: ActionDefinition<Input> = {
  key: "quote-delete",
  type: "perform",
  resource: "quote",
  title: "Delete Quote",
  description: "Delete a quote (quoteDelete).",
  idempotent: true,
  params: [
    { key: "id", label: "Quote ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Deleted ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, { id: string }>>(
      `mutation($id: ID!) { quoteDelete(id: $id) { id } }`,
      { id: input.id },
    );
    return data.quoteDelete;
  },
};

export default quoteDelete;
