import type { ActionDefinition } from "@w6w/types";
import { NewRelicClient } from "../lib/client.ts";
import { guidParam } from "../lib/params.ts";

/**
 * `{ actor { entity(guid: …) } }` — one entity in full.
 *
 * ## The interesting fields are behind inline fragments
 *
 * `Entity` is a GraphQL interface, and most of what anyone wants lives on the
 * concrete types implementing it. `alertSeverity` is on `AlertableEntity`;
 * `applicationId` and language on `ApmApplicationEntity`; the page layout on
 * `DashboardEntity`. A query asking for them flat fails with "cannot query
 * field on type Entity", which is accurate and unhelpful.
 *
 * This asks for the common ones through `... on` fragments, so a caller gets
 * the useful fields without having to know the type in advance — an entity that
 * is not an APM application simply has those fields absent.
 *
 * ## `alertSeverity` is the current alert state
 *
 * `NOT_ALERTING`, `WARNING`, `CRITICAL` or `NOT_CONFIGURED`. The last is the
 * one worth noticing: it means nothing is watching this entity at all, which is
 * a different and usually more serious condition than an entity that is fine.
 */
const action: ActionDefinition = {
  key: "entity-get",
  type: "read",
  resource: "entity",
  title: "Get an entity",
  description:
    "One entity in detail. `alertSeverity` of NOT_CONFIGURED means nothing is watching it at " +
    "all — a different condition from healthy, and easy to read as one.",
  params: [
    guidParam("Entity GUID", "From `entity-search`. Opaque and permanent."),
  ],
  output: [
    { key: "entity", type: "object", label: "The entity" },
    { key: "name", type: "string", label: "Its name" },
    { key: "reporting", type: "boolean", label: "Whether it is still sending data" },
    {
      key: "alertSeverity",
      type: "string",
      label: "NOT_ALERTING, WARNING, CRITICAL, NOT_CONFIGURED",
    },
    { key: "unmonitored", type: "boolean", label: "alertSeverity is NOT_CONFIGURED" },
    { key: "tags", type: "array", label: "Its tags" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const guid = String(p.guid ?? "").trim();
    if (!guid) throw new Error("`guid` is required");

    const data = await new NewRelicClient(ctx).gql<{
      actor?: {
        entity?: {
          name?: string;
          reporting?: boolean;
          alertSeverity?: string;
          tags?: Array<{ key?: string; values?: string[] }>;
        } | null;
      };
    }>(
      `query($guid: EntityGuid!) {
        actor {
          entity(guid: $guid) {
            guid name entityType domain type reporting accountId
            tags { key values }
            ... on AlertableEntity { alertSeverity }
            ... on ApmApplicationEntity { applicationId language }
            ... on BrowserApplicationEntity { applicationId servingApmApplicationId }
            ... on InfrastructureHostEntity { hostSummary { cpuUtilizationPercent memoryUsedPercent } }
          }
        }
      }`,
      { guid },
    );

    const entity = data?.actor?.entity;
    if (!entity) {
      throw new Error(
        `no entity with GUID ${guid} — GUIDs are region-specific, so an entity from a US ` +
          "account is not visible on an EU connection",
      );
    }

    return {
      entity,
      name: entity.name,
      reporting: entity.reporting,
      alertSeverity: entity.alertSeverity,
      // Not configured is not the same as healthy, and reads like it.
      unmonitored: entity.alertSeverity === "NOT_CONFIGURED",
      tags: entity.tags ?? [],
    };
  },
};

export default action;
