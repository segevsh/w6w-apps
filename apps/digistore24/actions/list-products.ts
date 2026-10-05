import type { ActionDefinition } from "@w6w/types";
import { compact, Ds24Client } from "../lib/client.ts";

interface Input {
  sort_by?: "name" | "group";
  merchant_id?: number;
}

const listProducts: ActionDefinition<Input> = {
  key: "list-products",
  type: "search",
  title: "List Products",
  description: "List your Digistore24 products.",
  params: [
    {
      key: "sort_by",
      label: "Sort by",
      type: "select",
      options: [{ value: "name", label: "name" }, { value: "group", label: "group" }],
    },
    {
      key: "merchant_id",
      label: "Merchant ID",
      type: "number",
      hint: "Only products of this merchant (for networks managing several vendors).",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Products" },
  ],

  execute(input, ctx) {
    return new Ds24Client(ctx).call(
      "listProducts",
      compact({ sort_by: input.sort_by, merchant_id: input.merchant_id }),
    );
  },
};

export default listProducts;
