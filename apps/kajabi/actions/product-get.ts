import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/products/{id}` — one product. */
interface Input {
  id: string;
  fields?: string;
}

const productGet: ActionDefinition<Input> = {
  key: "product-get",
  type: "read",
  resource: "product",
  title: "Get Product",
  description: "Fetch one product by id.",
  params: [
    idParam("Product ID", "`product-list` and `offer-product-list` return the ids."),
    fieldsParam("products", "title,status"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/products/${encodeURIComponent(input.id)}`, {
      query: { "fields[products]": unset(input.fields) },
    });
  },
};

export default productGet;
