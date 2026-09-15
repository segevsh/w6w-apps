import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  amountInCents: number;
  signupId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
  note?: string;
  isPrivate?: boolean;
  succeededAt?: string;
}

/**
 * `POST /api/v2/donations` — confirmed against the vendor's OpenAPI spec.
 * `externalId` "must be unique across donations" per the schema, so a
 * caller that always sets it gets a natural dedupe key even though this
 * action itself does not check for one before creating.
 */
const donationCreate: ActionDefinition<Input> = {
  key: "donation-create",
  type: "perform",
  resource: "donation",
  title: "Create Donation",
  description: "Record a donation against a person, by ID or by name/email.",
  idempotent: false,
  params: [
    { key: "amountInCents", label: "Amount (cents)", type: "number", required: true },
    {
      key: "signupId",
      label: "Person ID",
      type: "string",
      hint: "The donor's person record. Leave blank and provide email/first/last name instead " +
        "to let NationBuilder match or create the donor.",
    },
    { key: "email", label: "Donor email", type: "string" },
    { key: "firstName", label: "Donor first name", type: "string" },
    { key: "lastName", label: "Donor last name", type: "string" },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      advanced: true,
      hint: "A unique identifier from a third-party system. Must be unique across donations.",
    },
    { key: "note", label: "Note", type: "text" },
    { key: "isPrivate", label: "Private", type: "boolean", advanced: true },
    {
      key: "succeededAt",
      label: "Succeeded at (ISO 8601)",
      type: "datetime",
      advanced: true,
      hint: "When the donation succeeded. Leave blank to record it as pending.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Donation ID" },
    { key: "amount_in_cents", type: "number", label: "Amount (cents)" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/donations", {
      method: "POST",
      body: dataEnvelope("donations", {
        amount_in_cents: input.amountInCents,
        signup_id: input.signupId,
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        external_id: input.externalId,
        note: input.note,
        is_private: input.isPrivate,
        succeeded_at: input.succeededAt,
      }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default donationCreate;
