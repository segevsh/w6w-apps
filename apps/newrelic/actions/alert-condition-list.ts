import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * `nrqlConditionsSearch` — the conditions inside a policy, which are the things
 * that actually watch something.
 *
 * ## `enabled` is a field, and a disabled condition looks exactly like an
 * enabled one everywhere else
 *
 * Somebody silences a noisy condition during an incident and does not turn it
 * back on. The policy still lists it, the UI still shows it, and nothing fires
 * again. Counting the disabled ones is the cheapest audit there is, and it is
 * why this action reports them separately rather than leaving it to be noticed.
 *
 * ## The signal configuration is where alerts quietly stop working
 *
 * `signal.aggregationDelay` and `signal.fillOption` decide what happens when
 * data simply stops arriving. With the default, a condition on a service that
 * has died evaluates against *no data* and never fires — the outage is total
 * and the alert is silent. `expiration.openViolationOnExpiration` is the
 * setting that turns "no data" into an incident, and it is off unless somebody
 * turned it on.
 */
const action: ActionDefinition = {
  key: "alert-condition-list",
  type: "read",
  resource: "alert",
  title: "List alert conditions",
  description:
    "The NRQL conditions in a policy. Reports how many are DISABLED, and how many would stay " +
    "silent if data stopped arriving entirely.",
  params: [
    {
      key: "policyId",
      label: "Policy",
      type: "string",
      default: "",
      hint: "From `alert-policy-list`. Blank searches every condition on the account.",
    },
    ACCOUNT_PARAM,
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
    },
  ],
  output: [
    { key: "conditions", type: "array", label: "Conditions" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "disabledCount", type: "number", label: "Conditions that are switched off" },
    {
      key: "silentOnNoDataCount",
      type: "number",
      label: "Conditions that would not fire if data stopped",
    },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);
    const policyId = String(p.policyId ?? "").trim();

    const data = await client.gql<{
      actor?: {
        account?: {
          alerts?: {
            nrqlConditionsSearch?: {
              nrqlConditions?: Array<{
                id?: string;
                name?: string;
                enabled?: boolean;
                expiration?: { openViolationOnExpiration?: boolean };
              }>;
              nextCursor?: string | null;
            };
          };
        };
      };
    }>(
      `query($accountId: Int!, $cursor: String, $searchCriteria: AlertsNrqlConditionsSearchCriteriaInput) {
        actor {
          account(id: $accountId) {
            alerts {
              nrqlConditionsSearch(cursor: $cursor, searchCriteria: $searchCriteria) {
                nrqlConditions {
                  id name enabled type policyId
                  nrql { query }
                  expiration { expirationDuration openViolationOnExpiration closeViolationsOnExpiration }
                  signal { aggregationDelay fillOption }
                }
                nextCursor
              }
            }
          }
        }
      }`,
      compact({
        accountId: account,
        cursor: p.cursor,
        searchCriteria: policyId ? { policyId } : undefined,
      }),
    );

    const search = data?.actor?.account?.alerts?.nrqlConditionsSearch;
    const conditions = search?.nrqlConditions ?? [];

    return {
      conditions,
      count: conditions.length,
      // Silenced during an incident and never turned back on.
      disabledCount: conditions.filter((c) => c?.enabled === false).length,
      // A dead service sends no data, and a condition without this never fires.
      silentOnNoDataCount:
        conditions.filter((c) =>
          c?.enabled !== false && c?.expiration?.openViolationOnExpiration !== true
        ).length,
      cursor: search?.nextCursor ?? undefined,
    };
  },
};

export default action;
