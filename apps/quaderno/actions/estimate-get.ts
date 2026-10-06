import type { ActionDefinition } from "@w6w/types";
import { QuadernoClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const estimateGet: ActionDefinition<Input> = {
  key: "estimate-get",
  type: "read",
  resource: "estimate",
  title: "Get Estimate",
  description: "Fetch a single estimate (proforma) by ID.",
  params: [
    { key: "id", label: "Estimate ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "state", type: "string", label: "State" },
    { key: "total_cents", type: "number", label: "Total (cents)" },
  ],

  execute(input, ctx) {
    return new QuadernoClient(ctx).request(`/proformas/${input.id}`);
  },
};

export default estimateGet;
