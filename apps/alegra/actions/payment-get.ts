import type { ActionDefinition } from "@w6w/types";
import { AlegraClient, idPath } from "../lib/client.ts";

interface Input {
  id: string;
  fields?: string;
}

const paymentGet: ActionDefinition<Input> = {
  key: "payment-get",
  type: "read",
  resource: "payment",
  title: "Get Payment",
  description: "Fetch one payment by id.",
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
      "hint":
        "Comma-separated extra fields: editable, deletable, voidable, conciliation, associations, numberTemplate, bills, categories, debitNote, decimalPrecision.",
    },
  ],
  output: [{ key: "id", type: "string", label: "ID" }],

  async execute(input, ctx) {
    const client = new AlegraClient(ctx);
    return await client.request(`/payments/${idPath(input.id)}`, {
      query: { fields: input.fields },
    });
  },
};

export default paymentGet;
