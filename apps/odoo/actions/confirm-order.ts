import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, OdooClient, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  context?: Record<string, unknown>;
}

/**
 * `sale.order.action_confirm` — turn a quotation into a confirmed sales order.
 *
 * ## Why this is a named action and not "write state = sale"
 *
 * Setting `state` directly would change a field and nothing else. Confirming an
 * order is a business transaction: Odoo validates the order, allocates stock
 * moves, may create deliveries and invoicing schedules, and fires the
 * downstream automation that depends on it. `action_confirm` is the method that
 * does all of it.
 *
 * Odoo's own external API documentation makes this the general rule, and it is
 * worth quoting because it explains the whole shape of this app: each JSON-RPC
 * call runs in its OWN SQL transaction, so a sequence of calls is not atomic and
 * "one must be cautious when making multiple consecutive calls". Its stated
 * solution is "to always call a single method that performs all the related
 * operations in a single transaction", naming `sale.order`'s `action_confirm`
 * as the example. Business methods prefixed `action_` are exactly that.
 *
 * That is also the argument for the Call Method escape hatch: an Odoo database
 * has many such `action_*` methods, and reaching them safely matters more than
 * wrapping each one.
 *
 * Verified live (2026-08-03): `action_confirm` with `args: [[52]]` returned
 * `true`, and a follow-up read showed the order's `state` had moved from
 * `draft` to `sale`.
 *
 * `idempotent: true`: confirming an already-confirmed order leaves it confirmed.
 * Unlike a repeated `unlink`, this does not raise — the record is still there
 * and still in the target state.
 */
const confirmOrder: ActionDefinition<Input> = {
  key: "confirm-order",
  type: "perform",
  resource: "sale.order",
  title: "Confirm Sales Order",
  description:
    "Confirm one or more quotations (`sale.order.action_confirm`), moving them from draft to a " +
    "confirmed sale. Runs Odoo's full confirmation logic — stock moves, deliveries and " +
    "invoicing schedules — in a single transaction, not just a status change.",
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "69",
      hint: "A single id, or several separated by commas.",
    },
    CONTEXT_PARAM,
  ],
  output: [
    { key: "confirmed", type: "boolean", label: "Whether Odoo accepted the confirmation" },
    { key: "ids", type: "array", label: "Record ids confirmed" },
  ],

  async execute(input, ctx) {
    const ids = toIds(input.ids);
    if (ids.length === 0) throw new Error("Confirm Sales Order needs at least one record id.");

    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const result = await OdooClient.fromConnection(ctx).call<boolean>(
      "sale.order",
      "action_confirm",
      [ids],
      kwargs,
    );
    return { confirmed: result !== false, ids };
  },
};

export default confirmOrder;
