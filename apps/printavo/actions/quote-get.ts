import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { ORDER_DETAIL_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description: "Fetch one quote by ID, with notes, addresses and document URLs.",
  params: [
    { key: "id", label: "Quote ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { quote(id: $id) { ${ORDER_DETAIL_FIELDS} } }`,
      { id: input.id },
    );
    return data.quote;
  },
};

export default quoteGet;
