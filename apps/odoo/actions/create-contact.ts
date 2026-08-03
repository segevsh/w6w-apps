import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, mergeValues, OdooClient, VALUES_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  email?: string;
  phone?: string;
  isCompany?: boolean;
  parentId?: number;
  values?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `res.partner.create` — add a contact or company.
 *
 * ## The argument shape here is the one that bites people
 *
 * `create` MUST be called positionally. Passing the values as a keyword
 * (`kwargs: {vals_list: [...]}`) fails with `builtins.IndexError: list index out
 * of range`, because `create` is decorated `@api.model_create_multi` and the RPC
 * layer dispatches it by position. Verified live on 2026-08-03, along with both
 * working forms:
 *
 *   - `args: [{...}]`   -> returns a single integer id  (`167`)
 *   - `args: [[{...}]]` -> returns a list of ids        (`[166]`)
 *
 * This action uses the single-dict form and returns one `id`, which is what a
 * workflow step wants to pass to the next node.
 *
 * `idempotent: false` is the honest answer: `create` has no natural key and no
 * upsert semantics, so running it twice makes two partners.
 */
const createContact: ActionDefinition<Input> = {
  key: "create-contact",
  type: "perform",
  resource: "res.partner",
  title: "Create Contact",
  description:
    "Create a contact or company (`res.partner`) and return its record id. Set Is Company for " +
    "an organisation, or Parent Company to attach a person to one.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", row: "contact" },
    { key: "phone", label: "Phone", type: "string", row: "contact" },
    {
      key: "isCompany",
      label: "Is Company",
      type: "boolean",
      hint: "On for an organisation, off for a person. Odoo stores both in `res.partner`.",
    },
    {
      key: "parentId",
      label: "Parent Company ID",
      type: "number",
      hint: "Record id of the company this person belongs to (`parent_id`).",
    },
    VALUES_PARAM,
    CONTEXT_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Created record id" }],

  async execute(input, ctx) {
    const vals = mergeValues({
      name: input.name,
      email: input.email,
      phone: input.phone,
      is_company: input.isCompany,
      parent_id: input.parentId,
    }, input.values);

    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const id = await OdooClient.fromConnection(ctx).call<number>(
      "res.partner",
      "create",
      [vals],
      kwargs,
    );
    return { id };
  },
};

export default createContact;
