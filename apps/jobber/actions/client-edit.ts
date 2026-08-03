import type { ActionDefinition } from "@w6w/types";
import { CLIENT_FIELDS, compact, csv, JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  clientId: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isCompany?: boolean;
  emailToAdd?: string;
  phoneToAdd?: string;
  tagsToAdd?: string;
  tagsToDelete?: string;
  billingStreet1?: string;
  billingCity?: string;
  billingProvince?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  receivesReminders?: boolean;
  receivesFollowUps?: boolean;
}

const MUTATION = `
  mutation EditClient($clientId: EncodedId!, $input: ClientEditInput!) {
    clientEdit(clientId: $clientId, input: $input) {
      client { ${CLIENT_FIELDS} }
      userErrors { message path }
    }
  }
`;

/**
 * `ClientEditInput` is not a mirror of `ClientCreateInput`, and the difference
 * is the thing most likely to surprise: contact details are edited through
 * **`*ToAdd` / `*ToEdit` / `*ToDelete` lists**, not by replacing an array.
 * There is no `emails:` field on the edit input at all — sending one is a
 * schema error, not a silent no-op.
 *
 * This action exposes the append and tag-delete halves. Editing or removing an
 * existing email/phone needs that record's own EncodedId, which only
 * `client-get` can supply, so it is deliberately left to `graphql-query` rather
 * than modelled as a form field that would need a second lookup to fill in.
 */
const clientEdit: ActionDefinition<Input> = {
  key: "client-edit",
  type: "perform",
  resource: "client",
  title: "Edit Client",
  description:
    "Update a client's name, billing address, notification settings, and append an email, phone or tags. Only fields you set are touched.",
  idempotent: true,
  params: [
    { key: "clientId", label: "Client ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "isCompany", label: "Is a company", type: "boolean", advanced: true },
    {
      key: "emailToAdd",
      label: "Add email address",
      type: "string",
      hint: "Appended to the client's emails. Existing addresses are left alone.",
    },
    {
      key: "phoneToAdd",
      label: "Add phone number",
      type: "string",
      hint: "Appended to the client's phone numbers.",
    },
    {
      key: "tagsToAdd",
      label: "Add tags",
      type: "string",
      hint: "Comma-separated labels.",
      row: "tags",
    },
    { key: "tagsToDelete", label: "Remove tags", type: "string", row: "tags" },
    {
      key: "billingStreet1",
      label: "Billing street",
      type: "string",
      hint: "Setting any billing field replaces the whole billing address.",
      advanced: true,
    },
    { key: "billingCity", label: "Billing city", type: "string", advanced: true, row: "bill1" },
    {
      key: "billingProvince",
      label: "Billing state / province",
      type: "string",
      advanced: true,
      row: "bill1",
    },
    {
      key: "billingPostalCode",
      label: "Billing postal code",
      type: "string",
      advanced: true,
      row: "bill2",
    },
    {
      key: "billingCountry",
      label: "Billing country",
      type: "string",
      advanced: true,
      row: "bill2",
    },
    {
      key: "receivesReminders",
      label: "Receives visit reminders",
      type: "boolean",
      advanced: true,
    },
    { key: "receivesFollowUps", label: "Receives job follow-ups", type: "boolean", advanced: true },
  ],
  output: [{ key: "client", type: "object", label: "The updated client" }],

  async execute(input, ctx) {
    const billingAddress = compact({
      street1: input.billingStreet1,
      city: input.billingCity,
      province: input.billingProvince,
      postalCode: input.billingPostalCode,
      country: input.billingCountry,
    });

    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      clientId: input.clientId,
      input: compact({
        firstName: input.firstName,
        lastName: input.lastName,
        companyName: input.companyName,
        isCompany: input.isCompany,
        receivesReminders: input.receivesReminders,
        receivesFollowUps: input.receivesFollowUps,
        emailsToAdd: input.emailToAdd
          ? [{ address: input.emailToAdd, description: "MAIN", primary: false }]
          : undefined,
        phonesToAdd: input.phoneToAdd
          ? [{ number: input.phoneToAdd, description: "MAIN", primary: false }]
          : undefined,
        tagsToAdd: csv(input.tagsToAdd),
        tagsToDelete: csv(input.tagsToDelete),
        billingAddress: Object.keys(billingAddress).length ? billingAddress : undefined,
      }),
    });

    return unwrap(data, "clientEdit");
  },
};

export default clientEdit;
