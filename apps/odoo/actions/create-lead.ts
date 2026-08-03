import type { ActionDefinition } from "@w6w/types";
import { CONTEXT_PARAM, mergeValues, OdooClient, VALUES_PARAM } from "../lib/client.ts";

interface Input {
  name: string;
  type?: string;
  partnerId?: number;
  contactName?: string;
  emailFrom?: string;
  phone?: string;
  expectedRevenue?: number;
  values?: unknown;
  context?: Record<string, unknown>;
}

/**
 * `crm.lead.create` — add a lead or opportunity.
 *
 * `name` is the pipeline card's title, NOT a person's name — Odoo calls it the
 * "Opportunity" and it is the only genuinely required field. The human's name
 * goes in `contact_name`, and their address book link (if any) in `partner_id`.
 * Getting those three confused is the usual reason a created lead looks empty in
 * the UI, so they are exposed as separate, labelled params rather than left to
 * the Additional Values escape hatch.
 *
 * `email_from` is Odoo's field name for the lead's email address; it is not a
 * sender address.
 *
 * `idempotent: false`: `crm.lead` has no natural key, so running this twice
 * creates two pipeline cards.
 */
const createLead: ActionDefinition<Input> = {
  key: "create-lead",
  type: "perform",
  resource: "crm.lead",
  title: "Create Lead",
  description:
    "Create a CRM lead or opportunity (`crm.lead`) and return its record id. Name is the " +
    "pipeline card's title; the person's own name goes in Contact Name.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      placeholder: "Website redesign — Acme",
      hint: "The opportunity's title, as shown on the pipeline card.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { value: "lead", label: "Lead" },
        { value: "opportunity", label: "Opportunity" },
      ],
      hint:
        "Odoo stores both in `crm.lead`. Leaving this empty uses the database's default, which " +
        "depends on whether the CRM lead stage is enabled.",
    },
    {
      key: "partnerId",
      label: "Customer ID",
      type: "number",
      hint: "Record id of an existing contact (`partner_id`). Use List Contacts to find one.",
    },
    { key: "contactName", label: "Contact Name", type: "string", row: "person" },
    { key: "emailFrom", label: "Email", type: "string", row: "person" },
    { key: "phone", label: "Phone", type: "string", row: "person" },
    {
      key: "expectedRevenue",
      label: "Expected Revenue",
      type: "number",
      hint: "Odoo field `expected_revenue`, in the record's currency.",
    },
    VALUES_PARAM,
    CONTEXT_PARAM,
  ],
  output: [{ key: "id", type: "number", label: "Created record id" }],

  async execute(input, ctx) {
    const vals = mergeValues({
      name: input.name,
      type: input.type,
      partner_id: input.partnerId,
      contact_name: input.contactName,
      email_from: input.emailFrom,
      phone: input.phone,
      expected_revenue: input.expectedRevenue,
    }, input.values);

    const kwargs: Record<string, unknown> = {};
    if (input.context) kwargs.context = input.context;

    const id = await OdooClient.fromConnection(ctx).call<number>(
      "crm.lead",
      "create",
      [vals],
      kwargs,
    );
    return { id };
  },
};

export default createLead;
