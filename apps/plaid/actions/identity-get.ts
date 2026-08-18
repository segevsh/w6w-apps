import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";
import { ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM } from "../lib/params.ts";

/**
 * `POST /identity/get` — the account holder's name, address, email and phone,
 * **as the bank has them**.
 *
 * That last clause is the whole value. This is not what the user typed into a
 * signup form; it is what their bank believes, which makes it the primary tool
 * for verifying that the person opening an account is the person who owns it —
 * a name match between a bank record and an application is evidence, where a
 * self-reported name is not.
 *
 * It is correspondingly sensitive: this returns a real person's home address
 * and phone number. It requires the `identity` product to have been requested
 * when the Item was created, and it should be read when needed rather than
 * cached broadly.
 *
 * `owners` is an array per account, because a joint account genuinely has more
 * than one — a workflow that takes `owners[0]` will silently pick one of two
 * spouses.
 */
const action: ActionDefinition = {
  key: "identity-get",
  type: "read",
  resource: "identity",
  title: "Get account holder identity",
  description:
    "Names, addresses, emails and phones as the BANK holds them — which is what makes a name " +
    "match evidence. A joint account has several owners.",
  params: [ACCESS_TOKEN_PARAM, ACCOUNT_IDS_PARAM],
  output: [
    { key: "accounts", type: "array", label: "Accounts with their owners" },
    { key: "item", type: "object", label: "Item" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const accessToken = String(p.accessToken ?? "").trim();
    if (!accessToken) throw new Error("`accessToken` is required");
    const accountIds = csv(p.accountIds);

    return await new PlaidClient(ctx).request(
      "/identity/get",
      compact({
        access_token: accessToken,
        options: accountIds ? { account_ids: accountIds } : undefined,
      }),
    );
  },
};

export default action;
