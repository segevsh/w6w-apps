import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * `alerts { policiesSearch }` — the alert policies on an account.
 *
 * ## A policy is a container; the conditions are what actually watch anything
 *
 * A policy holds conditions and decides how their incidents are grouped. An
 * account can have a hundred policies and still be watching nothing, because a
 * policy with no conditions is legal and completely silent. `alert-condition-list`
 * is the half that answers whether something is actually monitored.
 *
 * ## `incidentPreference` decides how noisy an outage is
 *
 * `PER_POLICY` opens one incident for the whole policy however many conditions
 * fire — quiet, and it means a second failure during an open incident notifies
 * nobody. `PER_CONDITION` opens one per condition. `PER_CONDITION_AND_TARGET`
 * opens one per condition per entity, which for a policy covering two hundred
 * hosts is two hundred pages.
 *
 * It is the single setting most responsible for both missed alerts and alert
 * storms, and it is easy to have never looked at.
 */
const action: ActionDefinition = {
  key: "alert-policy-list",
  type: "read",
  resource: "alert",
  title: "List alert policies",
  description:
    "Alert policies on an account. A policy with no conditions is legal and watches nothing — " +
    "`alert-condition-list` is what answers whether anything is actually monitored.",
  params: [
    ACCOUNT_PARAM,
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
      hint: "The `nextCursor` from the previous page.",
    },
  ],
  output: [
    { key: "policies", type: "array", label: "Policies" },
    { key: "count", type: "number", label: "Returned in this page" },
    {
      key: "perPolicyCount",
      type: "number",
      label: "Policies that group all conditions into one incident",
    },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);

    const data = await client.gql<{
      actor?: {
        account?: {
          alerts?: {
            policiesSearch?: {
              policies?: Array<{ id?: string; name?: string; incidentPreference?: string }>;
              nextCursor?: string | null;
              totalCount?: number;
            };
          };
        };
      };
    }>(
      `query($accountId: Int!, $cursor: String) {
        actor {
          account(id: $accountId) {
            alerts {
              policiesSearch(cursor: $cursor) {
                policies { id name incidentPreference accountId }
                nextCursor
                totalCount
              }
            }
          }
        }
      }`,
      compact({ accountId: account, cursor: p.cursor }),
    );

    const search = data?.actor?.account?.alerts?.policiesSearch;
    const policies = search?.policies ?? [];

    return {
      policies,
      count: policies.length,
      // The setting that decides whether a second failure notifies anybody.
      perPolicyCount: policies.filter((policy) => policy?.incidentPreference === "PER_POLICY")
        .length,
      cursor: search?.nextCursor ?? undefined,
    };
  },
};

export default action;
