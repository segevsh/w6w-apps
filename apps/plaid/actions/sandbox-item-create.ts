import type { ActionDefinition } from "@w6w/types";
import { compact, csv, PlaidClient } from "../lib/client.ts";

/**
 * `POST /sandbox/public_token/create` — make an Item without a browser.
 *
 * **Sandbox only**, and the reason a Plaid workflow can be tested at all.
 * Everywhere else, creating an Item needs a human in Plaid Link; here, one call
 * returns a public token that `public-token-exchange` turns into a working
 * Item full of synthetic transactions.
 *
 * That makes the whole loop automatable end to end: create an Item, sync its
 * transactions, exercise the workflow, throw the Item away.
 *
 * `ins_109508` ("First Platypus Bank") is Plaid's standard sandbox institution
 * and the usual choice. The synthetic data is deterministic per institution, so
 * a test can assert on it.
 *
 * The action refuses to run on a production connection rather than failing at
 * Plaid, because the error there names a route rather than the reason.
 */
const action: ActionDefinition = {
  key: "sandbox-item-create",
  type: "perform",
  resource: "item",
  title: "Create a sandbox Item",
  description:
    "Make an Item with no browser — sandbox only. This is what makes a Plaid workflow testable " +
    "end to end, since every other environment needs a human in Plaid Link.",
  idempotent: false,
  params: [
    {
      key: "institutionId",
      label: "Institution ID",
      type: "string",
      default: "ins_109508",
      hint: "`ins_109508` is Plaid's standard sandbox bank. Its synthetic data is deterministic, " +
        "so a test can assert on it.",
    },
    {
      key: "products",
      label: "Products",
      type: "string",
      default: "transactions",
      hint: "Comma-separated. The Item is created with these enabled.",
    },
    {
      key: "webhook",
      label: "Webhook URL",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "public_token", type: "string", label: "Public token — exchange it next" },
    { key: "request_id", type: "string", label: "Request ID" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new PlaidClient(ctx);
    if (client.environment !== "sandbox") {
      throw new Error(
        "this endpoint exists only in Plaid's sandbox — in production an Item can only be " +
          "created by a person completing Plaid Link, which is by design",
      );
    }

    return await client.request(
      "/sandbox/public_token/create",
      compact({
        institution_id: String(p.institutionId ?? "ins_109508"),
        initial_products: csv(p.products) ?? ["transactions"],
        options: p.webhook ? { webhook: p.webhook } : undefined,
      }),
    );
  },
};

export default action;
