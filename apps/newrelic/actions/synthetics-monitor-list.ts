import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";
import { ACCOUNT_PARAM } from "../lib/params.ts";

/**
 * Synthetics monitors — the checks that run from outside and tell you the site
 * is up when nothing internal is complaining.
 *
 * Like dashboards, they are entities (`domain = 'SYNTH'`, `type = 'MONITOR'`)
 * rather than a separate endpoint.
 *
 * ## `monitorSummary.status` is not the monitor's own state
 *
 * A monitor has two independent things that can be wrong with it, and they are
 * reported in different fields:
 *
 * - `monitoredUrl` is failing — the site is down. This is what the monitor is
 *   for, and it appears in `monitorSummary.status`.
 * - The **monitor itself** is disabled or has no locations assigned. Then it
 *   runs nowhere, reports nothing, and its summary is silent rather than
 *   failing.
 *
 * A monitor that has been switched off looks calm. This action counts the
 * muted and non-reporting ones separately, because "no synthetics alerts" and
 * "no synthetics running" produce the same silence.
 */
const action: ActionDefinition = {
  key: "synthetics-monitor-list",
  type: "read",
  resource: "monitor",
  title: "List Synthetics monitors",
  description:
    "Uptime monitors on an account. A disabled monitor is silent rather than failing, so 'no " +
    "alerts' and 'nothing running' look identical — both are counted here.",
  params: [
    ACCOUNT_PARAM,
    { key: "name", label: "Name Contains", type: "string", default: "" },
    { key: "cursor", label: "Cursor", type: "string", default: "" },
  ],
  output: [
    { key: "monitors", type: "array", label: "Monitors, each with a guid" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "Total New Relic reports" },
    {
      key: "notReporting",
      type: "number",
      label: "Monitors sending nothing — disabled, or no locations",
    },
    { key: "failing", type: "number", label: "Monitors whose target is failing" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);
    const account = client.account(p.accountId);

    const clauses = [`domain = 'SYNTH'`, `type = 'MONITOR'`, `accountId = ${account}`];
    const name = String(p.name ?? "").trim();
    if (name) clauses.push(`name LIKE '${name.replace(/'/g, "")}'`);

    const data = await client.gql<{
      actor?: {
        entitySearch?: {
          count?: number;
          results?: {
            entities?: Array<{
              reporting?: boolean;
              monitorSummary?: { status?: string; successRate?: number };
            }>;
            nextCursor?: string | null;
          };
        };
      };
    }>(
      `query($query: String!, $cursor: String) {
        actor {
          entitySearch(query: $query) {
            count
            results(cursor: $cursor) {
              entities {
                guid name accountId reporting
                ... on SyntheticMonitorEntityOutline {
                  monitorType period monitoredUrl
                  monitorSummary { status successRate locationsRunning locationsFailing }
                }
                tags { key values }
              }
              nextCursor
            }
          }
        }
      }`,
      compact({ query: clauses.join(" AND "), cursor: p.cursor }),
    );

    const search = data?.actor?.entitySearch;
    const monitors = search?.results?.entities ?? [];

    return {
      monitors,
      count: monitors.length,
      total: search?.count,
      // Switched off, or with no locations — silent rather than failing.
      notReporting: monitors.filter((m) => m?.reporting === false).length,
      failing: monitors.filter((m) => m?.monitorSummary?.status === "FAILING").length,
      cursor: search?.results?.nextCursor ?? undefined,
    };
  },
};

export default action;
