import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/state-get.ts";

const sensor = ok({
  entity_id: "sensor.living_room_temperature",
  state: "21.5",
  attributes: { unit_of_measurement: "°C", friendly_name: "Living room temperature" },
  last_changed: "2026-08-18T10:00:00+00:00",
});

Deno.test("state-get: reads one entity and lifts the useful attributes out", async () => {
  const { ctx, calls } = mockCtx([sensor], { display });
  const result = await action.execute!({ entityId: "sensor.living_room_temperature" }, ctx) as {
    numericState: number;
    unit: string;
    friendlyName: string;
  };
  assertEquals(
    calls[0].url,
    "https://abc.ui.nabu.casa/api/states/sensor.living_room_temperature",
  );
  assertEquals(result.numericState, 21.5);
  assertEquals(result.unit, "°C");
  assertEquals(result.friendlyName, "Living room temperature");
});

/**
 * `unavailable` arrives as an ordinary string in a 200 and parses to NaN — the
 * failure that makes a threshold comparison silently false.
 */
Deno.test("state-get: unavailable and unknown are flagged and never become numbers", async () => {
  for (const state of ["unavailable", "unknown"]) {
    const { ctx } = mockCtx([ok({ entity_id: "sensor.x", state })], { display });
    const result = await action.execute!({ entityId: "sensor.x" }, ctx) as {
      usable: boolean;
      numericState?: number;
      state: string;
    };
    assertEquals(result.usable, false);
    assertEquals(result.numericState, undefined);
    assertEquals(result.state, state);
  }
});

/** "on" must not become 0. */
Deno.test("state-get: a non-numeric state stays undefined rather than becoming zero", async () => {
  const { ctx } = mockCtx([ok({ entity_id: "light.kitchen", state: "on" })], { display });
  const result = await action.execute!({ entityId: "light.kitchen" }, ctx) as {
    usable: boolean;
    numericState?: number;
  };
  assertEquals(result.usable, true);
  assertEquals(result.numericState, undefined);
});

Deno.test("state-get: zero is a real reading, not an absent one", async () => {
  const { ctx } = mockCtx([ok({ entity_id: "sensor.rain", state: "0" })], { display });
  const result = await action.execute!({ entityId: "sensor.rain" }, ctx) as {
    numericState: number;
  };
  assertEquals(result.numericState, 0);
});

/** The mistake is passing the friendly name. */
Deno.test("state-get: a friendly name is refused before the request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Living Room Temperature" }, ctx),
    Error,
    "friendly name",
  );
  assertEquals(calls.length, 0);
});

Deno.test("state-get: needs an entity", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`entityId` is required");
});

Deno.test("state-get: says the state is always a string", () => {
  assert(/ALWAYS a string/.test(action.description!), action.description);
});
