import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Sales Invoice",
  description: "Fetch one sales invoice by id.",
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
      "hint": "Comma-separated extra fields: pdf, xml, comments, events.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/invoices/${idPath(input.id)}`, {
      query: { fields: input.fields },
    });
  },
};

export default invoiceGet;
