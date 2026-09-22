import type { ActionDefinition } from "@w6w/types";
import { fetchApiUnits } from "../lib/client.ts";

/**
 * The account's remaining SEMrush API units.
 *
 * This is the one SEMrush call that costs **no** API units, and it lives on the
 * legacy host (`www.semrush.com/users/countapiunits.html`) rather than on
 * `api.semrush.com`. It takes the key as a `?key=` query parameter — the only
 * form the endpoint documents — so unlike every other Action here it is not
 * signed with an `Authorization` header. That difference is handled entirely in
 * `auth/api-key.ts`'s `sign` hook, which appends the key to the URL of any
 * request bound for that host; this Action sends a bare request and never sees
 * the credential.
 *
 * Worth knowing before scheduling it: the body is a bare number as plain text,
 * not JSON, and the vendor's **error** text on this endpoint echoes the
 * submitted key back inside `errors[0].message`. That is why a failure here
 * raises a status-only message — see `lib/client.ts` and the README.
 *
 * `{balance}` is a number. A `0` balance is a live connection with the units
 * spent, not a broken one.
 */
const apiUnitsBalanceGet: ActionDefinition<Record<string, never>> = {
  key: "api-units-balance-get",
  type: "read",
  resource: "account",
  title: "Get API Units Balance",
  description: "Read the account's remaining API units. This call itself costs none.",
  params: [],
  output: [{ key: "balance", type: "number", label: "API units remaining" }],

  async execute(_input, ctx) {
    return { balance: await fetchApiUnits(ctx) };
  },
};

export default apiUnitsBalanceGet;
