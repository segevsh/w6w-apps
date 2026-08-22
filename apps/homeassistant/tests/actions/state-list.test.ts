import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/state-list.ts";

const states = ok([
  { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen" } },
  { entity_id: "light.hall", state: "unavailable", attributes: {} },
  { entity_id: "sensor.kitchen_temp", state: "21.5", attributes: { unit_of_measurement: "°C" } },
  { entity_id: "sensor.garden", state: "unknown", attributes: {} },
  { entity_id: "binary_sensor.door", state: "off", attributes: {} },
]);

Deno.test("state-list: returns everything with a domain breakdown", async () => {
  const { ctx, calls } = mockCtx([states], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    total: number;
    domains: Array<{ domain: string; count: number }>;
  };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/states");
  assertEquals(result.count, 5);
  assertEquals(result.total, 5);
  assertEquals(result.domains[0], { domain: "light", count: 2 });
});

/** There is no server-side filter, so this narrows the result, not the transfer. */
Deno.test("state-list: filters by domain after fetching, and says total separately", async () => {
  const { ctx } = mockCtx([states], { display });
  const result = await action.execute!({ domains: "light" }, ctx) as {
    count: number;
    total: number;
  };
  assertEquals(result.count, 2);
  assertEquals(result.total, 5, "the instance still returned everything");
});

Deno.test("state-list: filters by a substring of the entity id", async () => {
  const { ctx } = mockCtx([states], { display });
  const result = await action.execute!({ entityPrefix: "kitchen" }, ctx) as { count: number };
  assertEquals(result.count, 2);
});

Deno.test("state-list: counts the entities that are not working, before filtering them", async () => {
  const kept = mockCtx([states], { display });
  const withAll = await kept.ctx && await action.execute!({}, kept.ctx) as {
    unavailable: number;
    count: number;
  };
  assertEquals(withAll.unavailable, 2);
  assertEquals(withAll.count, 5);

  const dropped = mockCtx([states], { display });
  const without = await action.execute!({ onlyUsable: true }, dropped.ctx) as {
    unavailable: number;
    count: number;
  };
  assertEquals(without.count, 3);
  assertEquals(without.unavailable, 2, "still reported, so the filtering is visible");
});

/** Attributes are most of the bytes on a large install. */
Deno.test("state-list: attributes can be dropped, leaving ids and states", async () => {
  const { ctx } = mockCtx([states], { display });
  const result = await action.execute!({ includeAttributes: false }, ctx) as {
    states: Array<Record<string, unknown>>;
  };
  assertEquals(Object.keys(result.states[0]).sort(), ["entity_id", "last_changed", "state"]);
});

Deno.test("state-list: an empty instance is a count of zero, not an error", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({}, ctx) as { count: number; domains: unknown[] };
  assertEquals(result.count, 0);
  assertEquals(result.domains, []);
});

Deno.test("state-list: logs counts, never the entities", async () => {
  const { ctx, logs } = mockCtx([states], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Kitchen"), JSON.stringify(logs));
  assertEquals(logs[0].data, { total: 5, count: 5, unavailable: 2 });
});

Deno.test("state-list: says there is no server-side filter", () => {
  assert(/NO server-side filter/.test(action.description!), action.description);
});
