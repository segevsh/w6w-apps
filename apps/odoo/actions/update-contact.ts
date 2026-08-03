import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, mergeValues, OdooClient, toIds, VALUES_PARAM } from "../lib/client.ts";

interface Input {
  ids: unknown;
  name?: string;
  email?: string;
  phone?: string;
  values?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `res.partner.write` — update existing contacts.
 *
 * `write` takes BOTH the recordset and the values positionally:
 * `args: [[166], {"name": "..."}]`. Verified live (2026-08-03): the call
 * returned `true` and a follow-up `read` confirmed the new value.
 *
 * Odoo's `write` is a patch, never a replace — fields you do not mention are
 * left alone. `mergeValues` drops `undefined` for exactly that reason, so an
 * empty form box means "leave it" rather than "blank it". To genuinely clear a
 * field, set it to `false` via Additional Values, which is Odoo's own idiom for
 * an empty value.
 *
 * `idempotent: true`: writing the same values again produces the same state,
 * so a retry is safe.
 */
const updateContact: ActionDefinition<Input> = {
  key: "update-contact",
  type: "perform",
  resource: "res.partner",
  title: "Update Contact",
  description:
    "Update one or more contacts (`res.partner`). Only the fields you supply are changed. To " +
    'clear a field, set it to `false` in Additional Values, e.g. `{"phone": false}`.',
  idempotent: true,
  params: [
    {
      key: "ids",
      label: "Record IDs",
      type: "string",
      required: true,
      placeholder: "42",
      hint: "A single id, or several separated by commas — all get the same values.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    VALUES_PARAM,
    CONTEXT_PARAM,
  ],
  output: [
    { key: "updated", type: "boolean", label: "Whether Odoo accepted the write" },
    { key: "ids", type: "array", label: "Record ids written" },
  ],

  async execute(input, ctx) {
    const vals = mergeValues({
      name: input.name,
      email: input.email,
      phone: input.phone,
    }, input.values);

    if (Object.keys(vals).length === 0) {
      throw new Error("Update Contact needs at least one field to change.");
    }

    const ids = toIds(input.ids);
    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const updated = await OdooClient.fromConnection(ctx).call<boolean>(
      "res.partner",
      "write",
      [ids, vals],
      kwargs,
    );
    return { updated, ids };
  },
};

export default updateContact;
