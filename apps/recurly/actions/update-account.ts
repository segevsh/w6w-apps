import type { ActionDefinition } from "@w6w/types";
import { pathId, RecurlyClient } from "../lib/client.ts";

interface Input {
  accountId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  vatNumber?: string;
  taxExempt?: boolean;
  preferredLocale?: string;
}

/**
 * `PUT /accounts/{account_id}` — update an account.
 *
 * Idempotent: sending the same values again converges on the same state.
 * Fields left unset here are simply omitted from the JSON body, so an unfilled
 * optional field never blanks a stored value.
 */
const updateAccount: ActionDefinition<Input> = {
  key: "update-account",
  type: "perform",
  resource: "account",
  title: "Update Account",
  description: "Update an existing account's profile fields.",
  idempotent: true,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint: "Recurly ID or account code prefixed `code-`.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "vatNumber", label: "VAT number", type: "string" },
    { key: "taxExempt", label: "Tax exempt", type: "boolean" },
    { key: "preferredLocale", label: "Preferred locale", type: "string" },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "code", type: "string", label: "Account code" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request(`/accounts/${pathId(input.accountId)}`, {
      method: "PUT",
      json: {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        company: input.company,
        vat_number: input.vatNumber,
        tax_exempt: input.taxExempt,
        preferred_locale: input.preferredLocale,
      },
    });
  },
};

export default updateAccount;
