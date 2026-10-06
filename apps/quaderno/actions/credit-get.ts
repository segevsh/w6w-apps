import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const creditGet: ActionDefinition<Input> = {
  key: "credit-get",
  type: "read",
  resource: "credit",
  title: "Get Credit Note",
  description: "Fetch a single credit note by ID.",
  params: [
    { key: "id", label: "Credit Note ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/credits/${input.id}`);
  },
};

export default creditGet;
