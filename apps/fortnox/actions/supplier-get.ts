import type { ActionDefinition } from "@w6w/types";
import { FortnoxClient, seg } from "../lib/client.ts";

interface Input {
  supplierNumber: string;
}

const supplierGet: ActionDefinition<Input> = {
  key: "supplier-get",
  type: "read",
  resource: "supplier",
  title: "Get Supplier",
  description: "Fetch one supplier by supplier number.",
  params: [
    {
      "key": "supplierNumber",
      "label": "Supplier number",
      "type": "string",
      "required": true,
    },
  ],
  output: [
    {
      "key": "Supplier",
      "type": "object",
      "label": "Supplier record",
    },
  ],

  execute(input, ctx) {
    return new FortnoxClient(ctx).get(`/3/suppliers/${seg(input.supplierNumber)}`);
  },
};

export default supplierGet;
