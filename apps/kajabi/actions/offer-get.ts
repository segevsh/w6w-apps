import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, includeParam, resourceOutput } from "../lib/params.ts";

/** `GET /v1/offers/{id}` — one offer, optionally with its products side-loaded. */
interface Input {
  id: string;
  include?: string;
  fields?: string;
}

const offerGet: ActionDefinition<Input> = {
  key: "offer-get",
  type: "read",
  resource: "offer",
  title: "Get Offer",
  description: "Fetch one offer by id.",
  params: [
    idParam("Offer ID", "`offer-list` returns the ids."),
    includeParam("e.g. `products` — cheaper than a second call to `offer-product-list`."),
    fieldsParam("offers", "title,price_in_cents"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/offers/${encodeURIComponent(input.id)}`, {
      query: {
        include: unset(input.include),
        "fields[offers]": unset(input.fields),
      },
    });
  },
};

export default offerGet;
