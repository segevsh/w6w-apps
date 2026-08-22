import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/device-env-set.ts";

const UUID = "a".repeat(32);
const device = { status: 200, body: { d: [{ id: 5, belongs_to__application: { __id: 1 } }] } };
const none = { status: 200, body: { d: [] } };
const existing = { status: 200, body: { d: [{ id: 10, value: "info" }] } };
const fleetHas = { status: 200, body: { d: [{ value: "warn" }] } };
const ok = { status: 200, body: {} };

Deno.test("device-env-set: creates a variable that does not exist", async () => {
  const { ctx, calls } = mockCtx([device, none, none, ok]);
  const result = await action.execute(
    { uuid: UUID, name: "LOG_LEVEL", value: "debug" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[3].method, "POST");
  assertEquals(new URL(calls[3].url).pathname, "/v7/device_environment_variable");
  assertEquals(JSON.parse(calls[3].body!), { device: 5, name: "LOG_LEVEL", value: "debug" });
  assertEquals(result.action, "created");
});

Deno.test("device-env-set: patches an existing variable by its id", async () => {
  const { ctx, calls } = mockCtx([device, existing, none, ok]);
  const result = await action.execute(
    { uuid: UUID, name: "LOG_LEVEL", value: "debug" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[3].method, "PATCH");
  assertEquals(new URL(calls[3].url).pathname, "/v7/device_environment_variable(10)");
  assertEquals(result.action, "updated");
});

/** Every change recreates the container. */
Deno.test("device-env-set: an unchanged value writes nothing and restarts nothing", async () => {
  const { ctx, calls, logs } = mockCtx([device, existing, none]);
  const result = await action.execute(
    { uuid: UUID, name: "LOG_LEVEL", value: "info" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.action, "unchanged");
  assertEquals(result.willRestartService, false);
  assertEquals(calls.length, 3, "nothing was written");
  assertEquals(logs.length, 0);
});

Deno.test("device-env-set: warns that a change recreates the container", async () => {
  const { ctx, logs } = mockCtx([device, none, none, ok]);
  await action.execute({ uuid: UUID, name: "LOG_LEVEL", value: "debug" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /recreating the container/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Removing restores the fleet's value; setting "" shadows it with an empty string. */
Deno.test("device-env-set: removing deletes the row and reports the inherited value", async () => {
  const { ctx, calls, logs } = mockCtx([device, existing, fleetHas, ok]);
  const result = await action.execute(
    { uuid: UUID, name: "LOG_LEVEL", remove: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[3].method, "DELETE");
  assertEquals(result.action, "removed");
  assertEquals(result.inheritedAfterRemoval, true);
  assert(logs.some((l) => /inherits its fleet's value/.test(l.message)), JSON.stringify(logs));
});

Deno.test("device-env-set: removing something that is not there changes nothing", async () => {
  const { ctx, calls } = mockCtx([device, none, none]);
  const result = await action.execute({ uuid: UUID, name: "NOPE", remove: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.action, "unchanged");
  assertEquals(calls.length, 3);
});

/** An empty string is a real value, and it shadows the fleet. */
Deno.test("device-env-set: setting an empty string still shadows the fleet's value", async () => {
  const { ctx, calls } = mockCtx([device, none, fleetHas, ok]);
  const result = await action.execute({ uuid: UUID, name: "LOG_LEVEL", value: "" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(calls[3].body!), { device: 5, name: "LOG_LEVEL", value: "" });
  assertEquals(result.shadowsFleetValue, true);
  assertEquals(result.action, "created");
});

Deno.test("device-env-set: requires a name", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () => await action.execute({ uuid: UUID }, ctx), Error, "`name`");
});
