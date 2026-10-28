import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1beta/properties` — verified against Google's Admin API discovery
 * document (`analyticsadmin.properties.list`).
 *
 * **`filter` is required**, per the discovery document, and it is the only
 * required parameter: Google will not list every property you can reach, only
 * the ones under a named parent. So this action takes an account id and builds
 * `parent:accounts/{id}` rather than exposing a raw filter string that is
 * almost always that one expression. `account-summary-list` is the way to get
 * the whole tree without a parent.
 */
const action: ActionDefinition = {
  key: "property-list",
  type: "read",
  resource: "property",
  title: "List an account's properties",
  description: "List the GA4 properties under one account.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "123456",
      hint: "The numeric account id. `accounts/` prefix optional.",
    },
    ...LIST_PARAMS,
    {
      key: "showDeleted",
      label: "Include Trashed",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.accountId ?? "").trim().replace(/^accounts\//, "");
    if (!raw) throw new Error("`accountId` is required");
    if (!/^\d+$/.test(raw)) {
      throw new Error(`\`accountId\` must be a numeric account id — got "${raw}"`);
    }

    const client = new GoogleAnalyticsClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing GA4 properties", { accountId: raw, returnAll, limit });

    return await client.adminAll(
      "/properties",
      "properties",
      {
        query: {
          // Google's required filter. `parent:accounts/{id}` is the expression
          // the endpoint exists to serve.
          filter: `parent:accounts/${raw}`,
          showDeleted: p.showDeleted === true ? "true" : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
