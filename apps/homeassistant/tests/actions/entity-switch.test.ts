import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/entity-switch.ts";

const changed = ok([{ entity_id: "light.kitchen", state: "on" }]);

/**
 * The domain-agnostic services dispatch to whatever the target is, so one
 * action covers lights, switches, fans, scripts and scenes alike.
 */
Deno.test("entity-switch: calls homeassistant.turn_on, not light.turn_on", async () => {
  const { ctx, calls } = mockCtx([changed], { display });
  await action.execute!({ entityId: "light.kitchen", action: "turn_on" }, ctx);
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/services/homeassistant/turn_on");
  assertEquals(JSON.parse(calls[0].body!), { entity_id: ["light.kitchen"] });
});

Deno.test("entity-switch: all three verbs map to their own service", async () => {
  for (const verb of ["turn_on", "turn_off", "toggle"]) {
    const { ctx, calls } = mockCtx([changed], { display });
    await action.execute!({ entityId: "switch.desk", action: verb }, ctx);
    assert(calls[0].url.endsWith(`/homeassistant/${verb}`), calls[0].url);
  }
});

Deno.test("entity-switch: mixed domains go in one call", async () => {
  const { ctx, calls } = mockCtx([changed], { display });
  const result = await action.execute!({
    entityId: "light.kitchen, switch.desk, script.goodnight",
    action: "turn_on",
  }, ctx) as { entities: string[] };
  assertEquals(JSON.parse(calls[0].body!).entity_id.length, 3);
  assertEquals(result.entities.length, 3);
});

/** Toggling something already in the requested state changes nothing. */
Deno.test("entity-switch: nothing changing is reported, not treated as failure", async () => {
  const { ctx } = mockCtx([ok([])], { display });
  const result = await action.execute!({ entityId: "light.kitchen", action: "turn_on" }, ctx) as {
    changedCount: number;
  };
  assertEquals(result.changedCount, 0);
});

Deno.test("entity-switch: an unknown verb is refused", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "light.kitchen", action: "explode" }, ctx),
    Error,
    "turn_on, turn_off or toggle",
  );
  assertEquals(calls.length, 0);
});

Deno.test("entity-switch: a friendly name is refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ entityId: "Kitchen Light", action: "turn_on" }, ctx),
    Error,
    "friendly name",
  );
});

Deno.test("entity-switch: needs entities", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ action: "turn_on" }, ctx),
    Error,
    "required",
  );
});

Deno.test("entity-switch: logs the shape of the call", async () => {
  const { ctx, logs } = mockCtx([changed], { display });
  await action.execute!({ entityId: "light.kitchen", action: "toggle" }, ctx);
  assertEquals(logs[0].data, { action: "toggle", targets: 1, changedCount: 1 });
});

/** It is idempotent because turn_on twice ends in the same state. */
Deno.test("entity-switch: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
