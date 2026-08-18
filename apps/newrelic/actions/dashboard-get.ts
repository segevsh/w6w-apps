import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";
import { guidParam } from "../lib/params.ts";

/**
 * One dashboard, with its pages, widgets and the NRQL behind each.
 *
 * ## The queries are the point
 *
 * Every widget carries the NRQL that draws it, in
 * `rawConfiguration.nrqlQueries`. That makes a dashboard a readable, versioned
 * catalogue of the questions a team actually asks — and it makes this action
 * the practical way to lift a query out of a dashboard somebody built in the UI
 * and run it from a workflow with `nrql-query`.
 *
 * ## `rawConfiguration` is untyped on purpose
 *
 * New Relic types the widget wrapper and leaves the configuration as a JSON
 * blob whose shape depends on the visualisation. A line chart and a billboard
 * do not have the same fields. This returns it as it comes rather than
 * pretending otherwise, and lifts out the NRQL, which is the part that has a
 * stable shape.
 */
const action: ActionDefinition = {
  key: "dashboard-get",
  type: "read",
  resource: "dashboard",
  title: "Get a dashboard",
  description:
    "A dashboard with its pages and widgets — including the NRQL behind each, which is the " +
    "practical way to lift a query out of a dashboard and run it elsewhere.",
  params: [
    guidParam("Dashboard GUID", "From `dashboard-list`."),
  ],
  output: [
    { key: "dashboard", type: "object", label: "The dashboard" },
    { key: "name", type: "string", label: "Its name" },
    { key: "pages", type: "array", label: "Its pages" },
    { key: "widgetCount", type: "number", label: "Widgets in total" },
    { key: "queries", type: "array", label: "Every NRQL query on it, with its widget's title" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const guid = String(p.guid ?? "").trim();
    if (!guid) throw new Error("`guid` is required");

    const data = await new NewRelicClient(ctx).gql<{
      actor?: {
        entity?: {
          name?: string;
          pages?: Array<{
            name?: string;
            widgets?: Array<{
              title?: string;
              rawConfiguration?: { nrqlQueries?: Array<{ accountId?: number; query?: string }> };
            }>;
          }>;
        } | null;
      };
    }>(
      `query($guid: EntityGuid!) {
        actor {
          entity(guid: $guid) {
            guid name accountId
            ... on DashboardEntity {
              description permissions createdAt updatedAt
              pages {
                guid name
                widgets {
                  id title visualization { id }
                  rawConfiguration
                }
              }
            }
          }
        }
      }`,
      { guid },
    );

    const dashboard = data?.actor?.entity;
    if (!dashboard) throw new Error(`no dashboard with GUID ${guid}`);

    const pages = dashboard.pages ?? [];
    const queries: Array<{ page?: string; widget?: string; accountId?: number; query?: string }> =
      [];
    let widgetCount = 0;
    for (const page of pages) {
      for (const widget of page?.widgets ?? []) {
        widgetCount++;
        // The one part of rawConfiguration with a stable shape.
        for (const nrql of widget?.rawConfiguration?.nrqlQueries ?? []) {
          queries.push({
            page: page?.name,
            widget: widget?.title,
            accountId: nrql?.accountId,
            query: nrql?.query,
          });
        }
      }
    }

    return { dashboard, name: dashboard.name, pages, widgetCount, queries };
  },
};

export default action;
