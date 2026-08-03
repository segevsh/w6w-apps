import type { ActionDefinition } from "@w6w/types";
import { GoogleAdsClient } from "../lib/client.ts";

interface Input {
  [key: string]: never;
}

/**
 * `CustomerService.ListAccessibleCustomers` —
 * `GET /v25/customers:listAccessibleCustomers`.
 *
 * The one endpoint in this API that takes no customer id: it answers "which
 * accounts can *this* OAuth credential reach directly", which is how you find
 * the ids every other action needs. The response is a bare list of relative
 * resource names (`customers/1234567890`), not customer objects — expand one
 * with `get-customer`, or walk a manager's whole tree with
 * `list-customer-clients`.
 *
 * Note "directly": for a manager credential this returns the manager, not its
 * clients. That is Google's access model, not a limitation here.
 */
const listAccessibleCustomers: ActionDefinition<Input> = {
  key: "list-accessible-customers",
  type: "read",
  resource: "customer",
  title: "List Accessible Customers",
  description:
    "List the Google Ads accounts this credential can reach directly, as relative resource names.",
  params: [],
  output: [{ key: "resourceNames", type: "array", label: "Customer resource names" }],

  execute(_input, ctx) {
    return new GoogleAdsClient(ctx).request("/customers:listAccessibleCustomers");
  },
};

export default listAccessibleCustomers;
