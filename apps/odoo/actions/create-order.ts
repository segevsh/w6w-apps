import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, mergeValues, OdooClient, VALUES_PARAM } from "../lib/client.ts";

interface Input {
  partnerId: number;
  lines?: unknown;
  values?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `sale.order.create` — raise a quotation.
 *
 * ## Order lines use Odoo's x2many command format
 *
 * This is the part that surprises people. You cannot hand Odoo a plain list of
 * line objects; a one-to-many field is written with COMMAND TRIPLES — small
 * arrays whose first element is an opcode. To attach new lines on create, the
 * opcode is `0`:
 *
 *     [[0, 0, {"product_id": 61, "product_uom_qty": 2}], …]
 *      ^  ^  ^-- the line's own values
 *      |  '----- ignored on create (a placeholder id)
 *      '-------- 0 = CREATE a new linked record
 *
 * Other opcodes you may need via Additional Values: `1` update a linked record,
 * `2` delete it, `3` unlink without deleting, `4` link an existing one, `5`
 * unlink all, `6` replace the whole set.
 *
 * The Lines param takes the command list verbatim rather than trying to hide it.
 * Inventing a friendlier shape and translating it would silently constrain what
 * a workflow can express — and the command format is what every Odoo integration
 * guide will show you.
 *
 * A newly created order is a DRAFT quotation. Use Confirm Sales Order to turn it
 * into a confirmed sale.
 *
 * `idempotent: false`: two runs make two quotations.
 */
const createOrder: ActionDefinition<Input> = {
  key: "create-order",
  type: "perform",
  resource: "sale.order",
  title: "Create Sales Order",
  description:
    "Create a draft quotation (`sale.order`) for a customer and return its record id. Add lines " +
    "with Odoo's x2many command format. Confirm it separately with Confirm Sales Order.",
  idempotent: false,
  params: [
    {
      key: "partnerId",
      label: "Customer ID",
      type: "number",
      required: true,
      hint: "Record id of the customer contact (`partner_id`). Use List Contacts to find one.",
    },
    {
      key: "lines",
      label: "Order Lines",
      type: "json",
      hint:
        'Odoo x2many commands, e.g. `[[0,0,{"product_id":61,"product_uom_qty":2}]]`. The leading ' +
        "`0` means create a new line. Product ids come from List Products.",
    },
    VALUES_PARAM,
    CONTEXT_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Created record id" }],

  async execute(input, ctx) {
    let lines: unknown = input.lines;
    if (typeof lines === "string" && lines.trim()) {
      try {
        lines = JSON.parse(lines);
      } catch {
        throw new Error("Order Lines is not valid JSON.");
      }
    }
    if (lines !== undefined && lines !== null && lines !== "" && !Array.isArray(lines)) {
      throw new Error("Order Lines must be a JSON array of Odoo x2many commands.");
    }

    const vals = mergeValues({
      partner_id: input.partnerId,
      order_line: Array.isArray(lines) && lines.length > 0 ? lines : undefined,
    }, input.values);

    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const id = await OdooClient.fromConnection(ctx).call<number>(
      "sale.order",
      "create",
      [vals],
      kwargs,
    );
    return { id };
  },
};

export default createOrder;
