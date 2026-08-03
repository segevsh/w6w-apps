import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, OdooClient, toIds } from "../lib/client.ts";

interface Input {
  ids: unknown;
  context?: Record<string, unknown>;
}

/**
 * `res.partner.unlink` — permanently delete contacts.
 *
 * `unlink` takes the recordset positionally and nothing else: `args: [[166,167]]`.
 * Verified live (2026-08-03): the call returned `true` and a follow-up
 * `search_count` for the same records returned `0`.
 *
 * `idempotent: false`, and the reason is worth stating because the end state
 * looks idempotent. Deleting an already-deleted record does not quietly succeed
 * — Odoo raises `MissingError` for ids that are no longer there. So while the
 * *effect* is stable, a retry is NOT safe: it converts a succeeded call into a
 * failed one. Marking this `true` would invite a host to turn a completed
 * deletion into a workflow error.
 *
 * Odoo also refuses to delete records that other records still reference,
 * raising a foreign-key error. That is a feature — it is what stops a workflow
 * from silently orphaning invoices — and the error is surfaced as-is.
 */
const deleteContact: ActionDefinition<Input> = {
  key: "delete-contact",
  type: "perform",
  resource: "res.partner",
  title: "Delete Contact",
  description:
    "Permanently delete one or more contacts (`res.partner`). Errors if an id no longer exists, " +
    "or if another record still references it — Odoo will not orphan linked documents.",
  idempotent: false,
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "42",
      hint: "A single id, or several separated by commas.",
    },
    CONTEXT_PARAM,
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Whether Odoo accepted the delete" },
    { key: "ids", type: "array", label: "Record ids deleted" },
  ],

  async execute(input, ctx) {
    const ids = toIds(input.ids);
    if (ids.length === 0) throw new Error("Delete Contact needs at least one record id.");

    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const deleted = await OdooClient.fromConnection(ctx).call<boolean>(
      "res.partner",
      "unlink",
      [ids],
      kwargs,
    );
    return { deleted, ids };
  },
};

export default deleteContact;
