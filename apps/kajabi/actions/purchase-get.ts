import type { ActionDefinition } from "@w6w/types";
import { KajabiClient, unset } from "../lib/client.ts";
import { fieldsParam, idParam, resourceOutput } from "../lib/params.ts";

/**
 * `GET /v1/purchases/{id}` — one purchase.
 *
 * Note this endpoint declares `fields[purchases]` but **no** `include` — unlike
 * `offer-get` and `order-get`. So no param for it is offered here; sending one
 * the operation does not declare would be guessing.
 */
interface Input {
  id: string;
  fields?: string;
}

const purchaseGet: ActionDefinition<Input> = {
  key: "purchase-get",
  type: "read",
  resource: "purchase",
  title: "Get Purchase",
  description: "Fetch one purchase by id.",
  params: [
    idParam("Purchase ID", "`purchase-list` returns the ids."),
    fieldsParam("purchases", "created_at"),
  ],
  output: resourceOutput,

  execute(input, ctx) {
    return new KajabiClient(ctx).request(`/purchases/${encodeURIComponent(input.id)}`, {
      query: { "fields[purchases]": unset(input.fields) },
    });
  },
};

export default purchaseGet;
