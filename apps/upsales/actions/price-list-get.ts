import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/priceLists/{id}` — Fetch one price list by ID. */
interface Input {
  id: number;
}

const priceListGet: ActionDefinition<Input> = {
  key: "price-list-get",
  type: "read",
  resource: "product",
  title: "Get Price List",
  description: "Fetch one price list by ID.",
  params: [idParam("id", "Price List ID")],
  output: [{ key: "data", type: "object", label: "The price list" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/priceLists/${encodeId(input.id)}`);
    return { data };
  },
};

export default priceListGet;
