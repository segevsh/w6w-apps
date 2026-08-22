import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/state-set.ts";

const written = ok({ entity_id: "sensor.office_occupancy", state: "4", attributes: {} });

/** The legitimate use: an entity with no device behind it. */
Deno.test("state-set: writes a state for an entity pushed in from outside", async () => {
  const { ctx, calls } = mockCtx([written], { display });
  await action.execute!({
    entityId: "sensor.office_occupancy",
    state: "4",
    attributes: '{"unit_of_measurement":"people"}',
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://abc.ui.nabu.casa/api/states/sensor.office_occupancy",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    state: "4",
    attributes: { unit_of_measurement: "people" },
  });
});

/**
 * The trap this action exists to prevent: Home Assistant's own docs say this
 * endpoint "will not communicate with the actual device", and the failure is
 * completely silent.
 */
Deno.test("state-set: a device domain is refused, and the error says to call a service", async () => {
  for (const entity of ["light.kitchen", "switch.desk", "climate.hall", "lock.front"]) {
    const { ctx, calls } = mockCtx([], { display });
    const error = await assertRejects(
      async () => await action.execute!({ entityId: entity, state: "on" }, ctx),
      Error,
    );
    assert(/will not communicate with the actual device/.test(error.message), error.message);
    assert(/service-call/.test(error.message), error.message);
    assert(/overwrite it on its next poll/.test(error.message), error.message);
    assertEquals(calls.length, 0);
  }
});

Deno.test("state-set: the guard can be overridden deliberately", async () => {
  const { ctx, calls } = mockCtx([written], { display });
  await action.execute!({
    entityId: "light.kitchen",
    state: "on",
    confirmNoDeviceControl: true,
  }, ctx);
  assertEquals(calls.length, 1);
});

/** Non-device domains are the intended use and need no acknowledgement. */
Deno.test("state-set: sensor and input domains need no confirmation", async () => {
  for (const entity of ["sensor.custom", "binary_sensor.flag", "input_text.note"]) {
    const { ctx, calls } = mockCtx([written], { display });
    await action.execute!({ entityId: entity, state: "x" }, ctx);
    assertEquals(calls.length, 1, entity);
  }
});

Deno.test("state-set: attributes default to an empty object, replacing whatever was there", async () => {
  const { ctx, calls } = mockCtx([written], { display });
  await action.execute!({ entityId: "sensor.custom", state: "1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).attributes, {});
});

Deno.test("state-set: needs an entity and a state", async () => {
  const noEntity = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ state: "1" }, noEntity.ctx),
    Error,
    "`entityId` is required",
  );
  const noState = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "sensor.x" }, noState.ctx),
    Error,
    "`state` is required",
  );
});

Deno.test("state-set: logs the entity, never the value", async () => {
  const { ctx, logs } = mockCtx([written], { display });
  await action.execute!({ entityId: "sensor.custom", state: "a secret reading" }, ctx);
  assert(!JSON.stringify(logs).includes("secret"), JSON.stringify(logs));
  assertEquals(logs[0].data, { entity_id: "sensor.custom", domain: "sensor" });
});

Deno.test("state-set: the description leads with what it does not do", () => {
  assert(/does NOT communicate with any\s+device/.test(action.description!), action.description);
});
