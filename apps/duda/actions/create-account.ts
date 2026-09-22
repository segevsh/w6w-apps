import type { ActionDefinition } from "@w6w/types";
import { compact, DudaClient } from "../lib/client.ts";

interface Input {
  accountName: string;
  firstName: string;
  lastName: string;
  accountType?: string;
  companyName?: string;
  email?: string;
  lang?: string;
  standing?: string;
  status?: string;
}

/**
 * `POST /api/accounts/create` — "Create Account".
 *
 * The body is `CreateOrUpdateAccount`, and it is the one schema in this surface
 * with required fields: `account_name`, `first_name` and `last_name`. Everything
 * else — `account_type` (`STAFF`/`CUSTOMER`), `company_name`, `email`, `lang`,
 * `standing` (`ACTIVE`/`SUSPENDED`) and `status` (`OK`/`SUSPENDED`) — is
 * optional.
 *
 * **Duda does not email the new account.** The docs are explicit that a
 * customer is only emailed for form submissions, stats emails, password resets,
 * comment notifications and site invites — not on account creation or update.
 * A workflow that creates an account therefore has to tell the person itself.
 *
 * `204 No Content` on success. Duda's documented rate limit is 60 calls/minute,
 * on top of the global 10 calls/second.
 */
const createAccount: ActionDefinition<Input> = {
  key: "create-account",
  type: "perform",
  resource: "account",
  title: "Create Account",
  description:
    "Create an account for a customer or staff member. Answers 204 with no content — Duda " +
    "does not send the new account an email. Duda's rate limit for this endpoint is 60 " +
    "calls/minute.",
  idempotent: false,
  params: [
    {
      key: "accountName",
      label: "Account name",
      type: "string",
      required: true,
      hint: "The name identifier for the new account — this is how every later call addresses it.",
    },
    {
      key: "firstName",
      label: "First name",
      type: "string",
      required: true,
    },
    {
      key: "lastName",
      label: "Last name",
      type: "string",
      required: true,
    },
    {
      key: "email",
      label: "Email",
      type: "string",
      advanced: true,
      hint: "Stored on the account. **Duda does not send the new account an email** — only form " +
        "submissions, stats emails, password resets, comment notifications and site invites " +
        "generate mail.",
    },
    {
      key: "accountType",
      label: "Account type",
      type: "select",
      advanced: true,
      default: "CUSTOMER",
      options: [
        { value: "CUSTOMER", label: "CUSTOMER" },
        { value: "STAFF", label: "STAFF" },
      ],
    },
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      advanced: true,
    },
    {
      key: "lang",
      label: "Language",
      type: "string",
      advanced: true,
      placeholder: "en",
    },
    {
      key: "standing",
      label: "Standing",
      type: "select",
      advanced: true,
      options: [
        { value: "ACTIVE", label: "ACTIVE" },
        { value: "SUSPENDED", label: "SUSPENDED" },
      ],
      hint: "The customer's access status.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      advanced: true,
      options: [
        { value: "OK", label: "OK" },
        { value: "SUSPENDED", label: "SUSPENDED" },
      ],
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  async execute(input, ctx) {
    const body = compact({
      account_name: input.accountName,
      first_name: input.firstName,
      last_name: input.lastName,
      account_type: input.accountType,
      company_name: input.companyName,
      email: input.email,
      lang: input.lang,
      standing: input.standing,
      status: input.status,
    });
    const { status } = await new DudaClient(ctx).send("/api/accounts/create", {
      method: "POST",
      body,
    });
    return { status };
  },
};

export default createAccount;
