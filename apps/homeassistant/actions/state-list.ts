import type { ActionDefinition } from "@w6w/types";
import { csv, type EntityState, HomeAssistantClient, isUsable } from "../lib/client.ts";

/**
 * `GET /api/states` — every entity, with its state and attributes.
 *
 * ## There is no server-side filter, and the payload is large
 *
 * Home Assistant returns **all** entities: a modest install has three or four
 * hundred, a well-instrumented one several thousand, and each carries its full
 * attribute dictionary. Several megabytes is normal. There is no `?domain=` or
 * `?entity_id=` parameter to narrow it — the API has one shape.
 *
 * So the filtering here happens after the fetch, which does not save the
 * transfer but does keep a workflow from carrying thousands of entities it
 * does not want. For a single entity, `state-get` is one small request and is
 * the right call.
 *
 * ## `unavailable` and `unknown` are states, not errors
 *
 * A dead integration reports its entities as `"unavailable"`; an entity that
 * has never had a value reads `"unknown"`. Both arrive as ordinary strings in a
 * 200, so `Number(state)` gives `NaN` and a comparison against `"off"` is
 * false. They are counted separately here, because "how many of my things are
 * broken" is a question worth being able to ask.
 */
const action: ActionDefinition = {
  key: "state-list",
  type: "read",
  resource: "state",
  title: "List entity states",
  description:
    "Every entity and its state. Home Assistant has NO server-side filter, so this is often " +
    "megabytes — filtering here narrows the result, not the transfer.",
  params: [
    {
      key: "domains",
      label: "Domains",
      type: "string",
      default: "",
      hint: "Comma-separated, e.g. `light, sensor, binary_sensor`. The part before the dot in an " +
        "entity id.",
    },
    {
      key: "entityPrefix",
      label: "Entity ID Contains",
      type: "string",
      default: "",
      hint: "A substring match on the entity id, e.g. `kitchen`.",
    },
    {
      key: "onlyUsable",
      label: "Exclude Unavailable",
      type: "boolean",
      default: false,
      hint: "Drops entities reading `unavailable` or `unknown` — the two states that mean the " +
        "integration behind them is not working.",
    },
    {
      key: "includeAttributes",
      label: "Include Attributes",
      type: "boolean",
      default: true,
      hint: "Off returns just entity ids and states, which is dramatically smaller on a large " +
        "install.",
    },
  ],
  output: [
    { key: "states", type: "array", label: "The entities that matched" },
    { key: "count", type: "number", label: "How many matched" },
    { key: "total", type: "number", label: "How many the instance has in all" },
    { key: "unavailable", type: "number", label: "Matching entities that are not working" },
    { key: "domains", type: "array", label: "The domains present, with counts" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const all = await new HomeAssistantClient(ctx).request<EntityState[]>("/states");
    const list = Array.isArray(all) ? all : [];

    const wantedDomains = csv(p.domains)?.map((d) => d.toLowerCase());
    const prefix = String(p.entityPrefix ?? "").trim().toLowerCase();

    let states = list.filter((entity) => {
      const id = String(entity?.entity_id ?? "").toLowerCase();
      if (wantedDomains && !wantedDomains.includes(id.split(".")[0])) return false;
      if (prefix && !id.includes(prefix)) return false;
      return true;
    });

    const unavailable = states.filter((entity) => !isUsable(entity?.state)).length;
    if (p.onlyUsable === true) states = states.filter((entity) => isUsable(entity?.state));
    if (p.includeAttributes === false) {
      states = states.map((entity) => ({
        entity_id: entity.entity_id,
        state: entity.state,
        last_changed: entity.last_changed,
      }));
    }

    const counts = new Map<string, number>();
    for (const entity of list) {
      const domain = String(entity?.entity_id ?? "").split(".")[0];
      if (domain) counts.set(domain, (counts.get(domain) ?? 0) + 1);
    }

    ctx.log("info", "read Home Assistant states", {
      total: list.length,
      count: states.length,
      unavailable,
    });

    return {
      states,
      count: states.length,
      total: list.length,
      unavailable,
      domains: [...counts.entries()].map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
};

export default action;
