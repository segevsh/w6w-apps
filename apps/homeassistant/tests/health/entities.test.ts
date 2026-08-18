import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import entities from "../../health/entities.ts";

const display = { url: "https://abc.ui.nabu.casa" };

const make = (total: number, broken: number, domain = "light") => {
  const list = [];
  for (let i = 0; i < broken; i++) {
    list.push({ entity_id: `${domain}.broken_${i}`, state: "unavailable" });
  }
  for (let i = broken; i < total; i++) {
    list.push({ entity_id: `sensor.fine_${i}`, state: "21.5" });
  }
  return { status: 200, body: list };
};

Deno.test("entities: everything reporting is healthy", async () => {
  const { ctx, calls } = mockCtx([make(100, 0)], { display });
  const result = await entities.check!({}, ctx);
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/states");
  assertEquals(result.state, "ok");
  assert(/all 100 entities/.test(result.message!), result.message);
});

/** A phone off the network or a seasonal device is background noise. */
Deno.test("entities: a few unavailable is still ok, and says so", async () => {
  const { ctx } = mockCtx([make(100, 3)], { display });
  const result = await entities.check!({}, ctx);
  assertEquals(result.state, "ok");
  assert(/within normal background/.test(result.message!), result.message);
});

Deno.test("entities: a handful is degraded", async () => {
  const { ctx } = mockCtx([make(100, 10)], { display });
  const result = await entities.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/10 of 100 entities unavailable/.test(result.message!), result.message);
});

/**
 * The failure this check exists for: an integration falls over and nothing is
 * reported anywhere, while every other check stays green.
 */
Deno.test("entities: a quarter of the instance is an integration that fell over", async () => {
  const { ctx } = mockCtx([make(100, 30)], { display });
  const result = await entities.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/integration has fallen over/.test(result.message!), result.message);
  assert(/error-log/.test(result.message!), "it does not say where to look");
});

/** Which domains points straight at the integration to look at. */
Deno.test("entities: the message names the domains the failures are concentrated in", async () => {
  const { ctx } = mockCtx([make(100, 30, "climate")], { display });
  const result = await entities.check!({}, ctx);
  assert(/climate \(30\)/.test(result.message!), result.message);
});

Deno.test("entities: `unknown` counts as not reporting, the same as `unavailable`", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [
      { entity_id: "sensor.a", state: "unknown" },
      { entity_id: "sensor.b", state: "1" },
    ],
  }], { display });
  const result = await entities.check!({}, ctx);
  assert(/1 of 2 entities unavailable/.test(result.message!), result.message);
});

Deno.test("entities: no entities at all is degraded, not ok", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }], { display });
  const result = await entities.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/fresh install/.test(result.message!), result.message);
});

Deno.test("entities: a rejected token is unknown, and an error is down", async () => {
  const rejected = mockCtx([{ status: 401, body: {} }], { display });
  assertEquals((await entities.check!({}, rejected.ctx)).state, "unknown");

  const erroring = mockCtx([{ status: 500, body: {} }], { display });
  assertEquals((await entities.check!({}, erroring.ctx)).state, "down");
});

Deno.test("entities: a body that is not a list is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { message: "nope" } }], { display });
  assertEquals((await entities.check!({}, ctx)).state, "unknown");
});

Deno.test("entities: runs rarely, because it fetches every state", () => {
  assertEquals(entities.minIntervalSeconds, 600);
  assertEquals(entities.credential, "signed");
  assertEquals(entities.severity, "informational");
});
