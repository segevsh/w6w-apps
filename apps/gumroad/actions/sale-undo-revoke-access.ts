import type { ActionDefinition } from "@w6w/types";
import { GumroadClient, seg } from "../lib/client.ts";

/**
 * `PUT /v2/sales/:saleId/undo_revoke_access`
 * Needs the `edit_sales` or `account` scope.
 */
interface Input {
  saleId: string;
}

const saleUndoRevokeAccess: ActionDefinition<Input> = {
  key: "sale-undo-revoke-access",
  type: "perform",
  resource: "sale",
  title: "Restore Sale Access",
  description:
    "Restore a buyer's access that was previously revoked. Needs the `edit_sales` or `account` scope.",
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
    "label": "False once restored",
  }],

  async execute(input, ctx) {
    const body = await new GumroadClient(ctx).call(
      "PUT",
      `/sales/${seg(input.saleId)}/undo_revoke_access`,
    );
    return body.sale;
  },
};

export default saleUndoRevokeAccess;
