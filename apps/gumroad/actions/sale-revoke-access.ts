import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/sales/:saleId/revoke_access`
 * Needs the `edit_sales` or `account` scope.
 */
interface Input {
  saleId: string;
}

const saleRevokeAccess: ActionDefinition<Input> = {
  key: "sale-revoke-access",
  type: "perform",
  resource: "sale",
  title: "Revoke Sale Access",
  description:
    "Remove the buyer's access without refunding. Refused for refunded sales, physical products and subscriptions. Needs the `edit_sales` or `account` scope.",
  idempotent: true,
  params: [{
    "key": "saleId",
    "label": "Sale ID",
    "type": "string",
    "required": true,
    "hint": "The sale's `id` from List Sales.",
  }],
  output: [{ "key": "id", "type": "string", "label": "Sale id" }, {
    "key": "access_revoked",
    "type": "boolean",
    "label": "True once revoked",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/sales/${seg(input.saleId)}/revoke_access`,
    );
    return body.sale;
  },
};

export default saleRevokeAccess;
