import type { ActionDefinition } from "@w6w/types";
import { DudaClient, seg } from "../lib/client.ts";

/**
 * `GET /api/accounts/{accountName}` — "Get Account By Name".
 *
 * The response schema is `Account`, and its property names are unusual: three
 * of them are the vendor's own literal strings with **spaces** —
 * `"Account first name"`, `"Account last name"`, `"Account name identifier"` —
 * and they are exactly as documented. They are passed through untouched; the
 * `output` block below names them the same way, quoted, so a downstream step
 * can map them without guessing.
 *
 * The rest is the ordinary surface: `email`, `account_type` (`STAFF` or
 * `CUSTOMER`), `standing` (`ACTIVE`/`SUSPENDED`, the customer's access status),
 * `status` (`OK`/`SUSPENDED`) and the `accountData` sub-object.
 */
const getAccount: ActionDefinition<{ accountName: string }> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Fetch one account by its name identifier.",
  params: [
    {
      key: "accountName",
      label: "Account name",
      type: "string",
      required: true,
      hint: "The account's name identifier — what `Account name identifier` holds.",
    },
  ],
  output: [
    { key: "Account name identifier", type: "string", label: "Account name identifier" },
    { key: "Account first name", type: "string", label: "First name" },
    { key: "Account last name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
    { key: "account_type", type: "string", label: "Type (STAFF or CUSTOMER)" },
    { key: "standing", type: "string", label: "Standing (ACTIVE or SUSPENDED)" },
    { key: "status", type: "string", label: "Status (OK or SUSPENDED)" },
    { key: "accountData", type: "object", label: "Account data" },
  ],

  execute(input, ctx) {
    return new DudaClient(ctx).request(`/api/accounts/${seg(input.accountName)}`);
  },
};

export default getAccount;
