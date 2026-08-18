import type { ActionDefinition } from "@w6w/types";
import { csv, entityId, HomeAssistantClient, query } from "../lib/client.ts";

/**
 * `GET /api/history/period/<timestamp>` — recorded state changes.
 *
 * ## `filter_entity_id` is effectively required
 *
 * The documentation calls it optional. Omitting it asks the recorder for every
 * state change of every entity over the period, which on a real install is
 * enormous and slow enough to make Home Assistant itself unresponsive — a
 * Raspberry Pi with an SQLite recorder will take minutes. This action requires
 * it, deliberately.
 *
 * ## Three flags that change the payload by an order of magnitude
 *
 * - `minimal_response` — only `state` and `last_changed` for entries after the
 *   first. The first entry of each entity is still full.
 * - `no_attributes` — skip attributes entirely, which is most of the bytes.
 * - `significant_changes_only` — skip changes the integration marked
 *   insignificant, which for a sensor that reports every ten seconds is most of
 *   them.
 *
 * All three default **on** here, because the un-flagged response is rarely what
 * anyone wants and is what makes this endpoint feel broken.
 *
 * ## History is only what the recorder kept
 *
 * The recorder's default retention is ten days, and installs commonly exclude
 * chatty entities from it entirely. An empty result may mean nothing happened,
 * or that this entity was never recorded — the two are indistinguishable here.
 */
const action: ActionDefinition = {
  key: "history-get",
  type: "read",
  resource: "history",
  title: "Get state history",
  description:
    "Recorded state changes for named entities. Asking without naming entities would query every " +
    "entity on the instance, so this requires them.",
  params: [
    {
      key: "entityId",
      label: "Entities",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated entity ids. Required here even though the API calls it optional — " +
        "omitting it can make a small instance unresponsive for minutes.",
    },
    {
      key: "startTime",
      label: "From",
      type: "string",
      default: "",
      hint: "ISO 8601. Defaults to one day ago, which is the API's own default.",
    },
    {
      key: "endTime",
      label: "To",
      type: "string",
      default: "",
      hint: "ISO 8601. Defaults to now.",
    },
    {
      key: "minimalResponse",
      label: "Minimal Response",
      type: "boolean",
      default: true,
      hint: "Drops everything but state and timestamp after each entity's first entry.",
    },
    {
      key: "noAttributes",
      label: "Skip Attributes",
      type: "boolean",
      default: true,
      hint: "Attributes are most of the payload and are rarely wanted for a history query.",
    },
    {
      key: "significantChangesOnly",
      label: "Significant Changes Only",
      type: "boolean",
      default: true,
      hint: "Off includes every recorded sample, which for a sensor polling every ten seconds is " +
        "thousands of near-identical rows.",
    },
  ],
  output: [
    { key: "history", type: "array", label: "One array of changes per entity" },
    { key: "entities", type: "number", label: "Entities with any recorded history" },
    { key: "count", type: "number", label: "State changes in total" },
    { key: "missing", type: "array", label: "Entities the recorder returned nothing for" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const entities = csv(p.entityId)?.map((e, i) => entityId(e, `entityId[${i}]`));
    if (!entities || entities.length === 0) throw new Error("`entityId` is required");

    const start = String(p.startTime ?? "").trim();
    const path = start ? `/history/period/${encodeURIComponent(start)}` : "/history/period";

    const result = await new HomeAssistantClient(ctx).request<
      Array<Array<{ entity_id?: string }>>
    >(path, {
      query: query({
        filter_entity_id: entities.join(","),
        end_time: p.endTime,
        // Presence flags: Home Assistant tests for the key, not its value — so
        // any value works, and an empty one would be dropped as unset.
        minimal_response: p.minimalResponse === false ? undefined : true,
        no_attributes: p.noAttributes === false ? undefined : true,
        significant_changes_only: p.significantChangesOnly === false ? undefined : true,
      }),
    });

    const history = Array.isArray(result) ? result : [];
    const count = history.reduce((sum, series) => sum + (series?.length ?? 0), 0);
    // The first entry of each series carries the entity id even in minimal mode.
    const present = new Set(
      history.map((series) => String(series?.[0]?.entity_id ?? "")).filter(Boolean),
    );
    const missing = entities.filter((entity) => !present.has(entity));

    ctx.log("info", "read Home Assistant history", {
      entities: history.length,
      count,
      missing: missing.length,
    });

    return { history, entities: history.length, count, missing };
  },
};

export default action;
