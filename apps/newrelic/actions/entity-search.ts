import type { ActionDefinition } from "@w6w/types";
import { compact, NewRelicClient } from "../lib/client.ts";

/**
 * `entitySearch` — find applications, hosts, monitors, dashboards, anything.
 *
 * ## An entity is the unit New Relic addresses everything by
 *
 * An APM application, a browser app, a Kubernetes cluster, a Synthetics
 * monitor, a dashboard and an alert-condition target are all *entities*, each
 * with a **GUID** — an opaque, permanent handle that every other part of the
 * API takes. Tagging, deployments, alerts and dashboards all want a GUID, and
 * this is where they come from.
 *
 * ## The query language is neither NRQL nor GraphQL
 *
 * `entitySearch(query: …)` takes a third syntax of its own:
 * `name LIKE 'checkout' AND domain = 'APM' AND type = 'APPLICATION'`. It
 * supports `=`, `LIKE`, `IN`, `AND`, and single quotes only. Writing NRQL here
 * fails, and writing SQL fails differently.
 *
 * ## `reporting` is the field that answers "is it still there"
 *
 * An entity that has stopped sending data does not disappear — it stays,
 * searchable, with `reporting: false`, for eight days. A workflow that lists
 * applications and assumes they are live will include ones that went away last
 * Tuesday, so this counts them separately.
 */
const action: ActionDefinition = {
  key: "entity-search",
  type: "search",
  resource: "entity",
  title: "Search entities",
  description:
    "Find applications, hosts, monitors and dashboards, and get their GUIDs. Entities that " +
    "stopped reporting stay searchable for days — those are counted separately.",
  params: [
    {
      key: "query",
      label: "Query",
      type: "string",
      default: "",
      placeholder: "name LIKE 'checkout' AND domain = 'APM'",
      hint: "Entity-search syntax — not NRQL and not SQL. `=`, `LIKE`, `IN`, `AND`, single " +
        "quotes. Leave blank and give the fields below instead.",
    },
    {
      key: "name",
      label: "Name Contains",
      type: "string",
      default: "",
      hint: "Builds a `name LIKE` clause, so the syntax does not have to be learned.",
    },
    {
      key: "domain",
      label: "Domain",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Any" },
        { value: "APM", label: "APM — server-side applications" },
        { value: "BROWSER", label: "Browser" },
        { value: "INFRA", label: "Infrastructure — hosts and containers" },
        { value: "MOBILE", label: "Mobile" },
        { value: "SYNTH", label: "Synthetics — monitors" },
        { value: "VIZ", label: "Visualisation — dashboards" },
        { value: "EXT", label: "External — integrations" },
      ],
    },
    {
      key: "type",
      label: "Type",
      type: "string",
      default: "",
      placeholder: "APPLICATION",
      hint: "Within a domain — `APPLICATION`, `HOST`, `MONITOR`, `DASHBOARD`.",
    },
    {
      key: "reportingOnly",
      label: "Only Reporting",
      type: "boolean",
      default: false,
      hint: "Drops entities that have stopped sending data — they remain searchable for about " +
        "eight days after they go quiet.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      default: "",
      hint: "The `nextCursor` from the previous page.",
    },
  ],
  output: [
    { key: "entities", type: "array", label: "Matching entities, each with a guid" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "total", type: "number", label: "Total matches New Relic reports" },
    { key: "notReporting", type: "number", label: "Matches that have stopped sending data" },
    { key: "guids", type: "array", label: "Just the GUIDs" },
    { key: "cursor", type: "string", label: "Pass back for the next page" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = new NewRelicClient(ctx);

    // Either the raw clause, or one assembled from the friendly fields.
    const clauses: string[] = [];
    const raw = String(p.query ?? "").trim();
    if (raw) clauses.push(`(${raw})`);
    const name = String(p.name ?? "").trim();
    // Single quotes only, and a quote in the value would break the clause.
    if (name) clauses.push(`name LIKE '${name.replace(/'/g, "")}'`);
    const domain = String(p.domain ?? "").trim();
    if (domain) clauses.push(`domain = '${domain}'`);
    const type = String(p.type ?? "").trim();
    if (type) clauses.push(`type = '${type.replace(/'/g, "")}'`);
    if (clauses.length === 0) {
      throw new Error("give a `query`, or a `name`, `domain` or `type` to search by");
    }

    const data = await client.gql<{
      actor?: {
        entitySearch?: {
          count?: number;
          results?: {
            entities?: Array<{ guid?: string; name?: string; reporting?: boolean }>;
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
                guid name entityType domain type reporting
                accountId
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
    let entities = search?.results?.entities ?? [];
    const notReporting = entities.filter((e) => e?.reporting === false).length;
    if (p.reportingOnly === true) entities = entities.filter((e) => e?.reporting !== false);

    ctx.log("info", "searched New Relic entities", {
      count: entities.length,
      total: search?.count,
      notReporting,
    });

    return {
      entities,
      count: entities.length,
      total: search?.count,
      notReporting,
      guids: entities.map((e) => e?.guid).filter(Boolean),
      cursor: search?.results?.nextCursor ?? undefined,
    };
  },
};

export default action;
