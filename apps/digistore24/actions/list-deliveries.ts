import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  purchase_id?: string;
  from?: string;
  to?: string;
  type?: string;
  same_address_as?: string;
  is_processed?: boolean;
  is_test_order?: "Y" | "N";
}

const listDeliveries: ActionDefinition<Input> = {
  key: "list-deliveries",
  type: "search",
  title: "List Deliveries",
  description: "List deliveries of physical goods.",
  params: [
    { key: "purchase_id", label: "Purchase ID", type: "string" },
    { key: "from", label: "From", type: "string", hint: "Start date, e.g. 2026-01-01." },
    { key: "to", label: "To", type: "string", hint: "End date." },
    {
      key: "type",
      label: "Delivery types",
      type: "string",
      hint: "Comma separated: request,in_progress,delivery,partial_delivery,return,cancel.",
    },
    { key: "same_address_as", label: "Same address as delivery", type: "string" },
    { key: "is_processed", label: "Is processed", type: "boolean" },
    {
      key: "is_test_order",
      label: "Is test order",
      type: "select",
      options: [{ value: "Y", label: "Y" }, { value: "N", label: "N" }],
    },
  ],
  output: [
    { key: "delivery", type: "array", label: "Deliveries" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listDeliveries",
      compact({
        search: compact({
          purchase_id: input.purchase_id,
          from: input.from,
          to: input.to,
          type: input.type,
          same_address_as: input.same_address_as,
          is_processed: input.is_processed,
          is_test_order: input.is_test_order,
        }),
      }),
    );
  },
};

export default listDeliveries;
