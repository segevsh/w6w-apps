import type { ActionDefinition } from "@w6w/types";
import { RecurlyClient } from "../lib/client.ts";

interface Input {
  code: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  vatNumber?: string;
  taxExempt?: boolean;
  preferredLocale?: string;
}

/**
 * `POST /accounts` — create an account.
 *
 * `code` is the only required field, and it is immutable once set — Recurly's
 * schema description: "The unique identifier of the account. This cannot be
 * changed once the account is created." Not idempotent: a retry with the same
 * `code` fails as a duplicate rather than silently succeeding twice, so a
 * retry is at least safe from creating a second account, but this action does
 * not treat that failure specially.
 */
const createAccount: ActionDefinition<Input> = {
  key: "create-account",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description: "Create a new account. `code` is permanent once set.",
  idempotent: false,
  params: [
    {
      key: "code",
      label: "Account code",
      type: "string",
      required: true,
      hint: "Unique identifier for this account. Cannot be changed later.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "company", label: "Company", type: "string" },
    { key: "vatNumber", label: "VAT number", type: "string" },
    {
      key: "taxExempt",
      label: "Tax exempt",
      type: "boolean",
      hint: "`true` exempts tax on the account, `false` applies it.",
    },
    {
      key: "preferredLocale",
      label: "Preferred locale",
      type: "string",
      hint: "Used for emails sent to the customer. Must be a locale enabled on the site.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "code", type: "string", label: "Account code" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request("/accounts", {
      json: {
        code: input.code,
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

export default createAccount;
