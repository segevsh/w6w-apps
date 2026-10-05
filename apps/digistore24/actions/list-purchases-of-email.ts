import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  email: string;
  limit?: number;
}

const listPurchasesOfEmail: ActionDefinition<Input> = {
  key: "list-purchases-of-email",
  type: "search",
  title: "List Purchases of Email",
  description: "List purchases made with one email address.",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Maximum purchases to return. Default 100.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Purchases" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listPurchasesOfEmail",
      compact({ email: input.email, limit: input.limit }),
    );
  },
};

export default listPurchasesOfEmail;
