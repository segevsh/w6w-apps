/**
 * `POST /api/v2/customers` — create a customer.
 *
 * TeamUp documents exactly five body fields for this operation: `first_name`,
 * `last_name`, `field_values`, `referral_code` and `venue`. There is no
 * `email` field, and this build does not invent one — `email` exists on the
 * Customer read back, but it is not part of the documented create body, and
 * there is no customer-update action in this app because TeamUp's reference
 * publishes no request-body schema for its customer-update operations (see the
 * README).
 *
 *  - `field_values` carries this business's custom fields. TeamUp documents it
 *    as an array without publishing an element schema, so it is exposed as
 *    JSON and passed through exactly as given — the field names come from the
 *    business's own TeamUp configuration.
 *  - `referral_code` attributes the new customer to a referral code.
 *  - `venue` pins the customer to one of the business's locations.
 *
 * The `201` body is the created Customer — the same shape `customers-get`
 * returns — and its `id` is the handle every other customer action takes.
 */
import type { ActionDefinition } from "@w6w/types";
import { compact, TeamUpClient } from "../lib/client.ts";
import { type CommonInput, commonParams, commonQuery } from "../lib/params.ts";
import { customerOutput } from "../lib/outputs.ts";

interface Input extends CommonInput {
  first_name: string;
  last_name: string;
  field_values?: unknown;
  referral_code?: string;
  venue?: number;
}

const action: ActionDefinition<Input> = {
  key: "customers-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description:
    "Create a customer with the five fields TeamUp documents, optionally pinning a venue and " +
    "setting custom fields (POST /api/v2/customers).",
  idempotent: false,
  params: [
    { key: "first_name", label: "First name", type: "string", required: true },
    { key: "last_name", label: "Last name", type: "string", required: true },
    {
      key: "field_values",
      label: "Custom field values",
      type: "json",
      hint: "This business's custom fields, as TeamUp's own array. Passed through unchanged.",
    },
    {
      key: "referral_code",
      label: "Referral code",
      type: "string",
      hint: "Attributes the new customer to a referral code.",
    },
    {
      key: "venue",
      label: "Venue ID",
      type: "number",
      validation: { integer: true },
      hint: "Pin the customer to one of the business's venues.",
    },
    ...commonParams(),
  ],
  output: customerOutput,

  execute(input, ctx) {
    const body = compact({
      first_name: input.first_name,
      last_name: input.last_name,
      field_values: input.field_values,
      referral_code: input.referral_code,
      venue: input.venue,
    });
    return new TeamUpClient(ctx).request("/customers", {
      method: "POST",
      body,
      query: commonQuery(input),
      providerId: input.providerId,
    });
  },
};

export default action;
