import type { ActionDefinition } from "@w6w/types";
import { buildGaql, fieldPaths, GoogleAdsClient } from "../lib/client.ts";
import { customerId, extraFields, limit, pageToken, searchOutput, where } from "../lib/params.ts";

interface Input {
  customerId?: string;
  includeHidden?: boolean;
  managersOnly?: boolean;
  where?: string;
  extraFields?: string;
  limit?: number;
  pageToken?: string;
}

/**
 * Walk a manager account's tree, via GAQL `FROM customer_client`.
 *
 * The complement to `list-accessible-customers`: that one answers "what can
 * this credential reach *directly*" and, for a manager credential, returns just
 * the manager. `customer_client` is the resource that expands a manager into
 * every account beneath it, at any depth — `customer_client.level` is 0 for the
 * account itself, 1 for direct children, and so on.
 *
 * `customer_client.hidden` accounts are excluded by default because Google
 * hides them from its own UI; the flag brings them back rather than pretending
 * they don't exist.
 */
const listCustomerClients: ActionDefinition<Input> = {
  key: "list-customer-clients",
  type: "read",
  resource: "customer_client",
  title: "List Customer Clients",
  description:
    "List the accounts beneath a manager account, at any depth, with their level, currency and time zone.",
  params: [
    customerId,
    {
      key: "includeHidden",
      label: "Include hidden accounts",
      type: "boolean",
      hint: "Hidden accounts are excluded by default, matching the Google Ads UI.",
    },
    {
      key: "managersOnly",
      label: "Managers only",
      type: "boolean",
      hint: "Return only accounts that are themselves managers.",
    },
    where,
    extraFields,
    limit,
    pageToken,
  ],
  output: searchOutput,

  execute(input, ctx) {
    const client = new GoogleAdsClient(ctx);
    const query = buildGaql({
      select: [
        "customer_client.resource_name",
        "customer_client.client_customer",
        "customer_client.id",
        "customer_client.descriptive_name",
        "customer_client.currency_code",
        "customer_client.time_zone",
        "customer_client.level",
        "customer_client.manager",
        "customer_client.test_account",
        "customer_client.hidden",
        "customer_client.status",
        ...fieldPaths(input.extraFields, "extraFields"),
      ],
      from: "customer_client",
      where: [
        input.includeHidden ? undefined : "customer_client.hidden = FALSE",
        input.managersOnly ? "customer_client.manager = TRUE" : undefined,
        input.where,
      ],
      orderBy: "customer_client.level",
      limit: input.limit,
    });
    return client.search(client.customerId(input.customerId), {
      query,
      pageToken: input.pageToken,
    });
  },
};

export default listCustomerClients;
