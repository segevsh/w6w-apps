import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-scale.ts";

const ORG = "11111111-2222-3333-4444-555555555555";
const SVC = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const D = { display: { organizationId: ORG, plane: "control" } };
const scaled = (idleScaling = true) => ({ status: 200, body: { result: { idleScaling } } });

Deno.test("service-scale: PATCHes the replica scaling endpoint", async () => {
  const { ctx, calls } = mockCtx([scaled()], D);
  const result = await action.execute(
    { serviceId: SVC, minReplicaMemoryGb: 16 },
    ctx,
  ) as Record<string, unknown>;
  assert(calls[0].url.endsWith(`/services/${SVC}/replicaScaling`), calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!).minReplicaMemoryGb, 16);
  assertEquals(result.changed, ["minReplicaMemoryGb"]);
});

/** Only the expensive direction is gated. */
Deno.test("service-scale: turning idle scaling off needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC, idleScaling: "false" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmAlwaysOn`/.test(message), message);
  assert(/billed every hour whether or not anything queries it/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-scale: turning it on is not gated", async () => {
  const { ctx, calls, logs } = mockCtx([scaled(true)], D);
  await action.execute({ serviceId: SVC, idleScaling: "true" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).idleScaling, true);
  assertEquals(logs[0].level, "info");
});

Deno.test("service-scale: an acknowledged always-on warns", async () => {
  const { ctx, calls, logs } = mockCtx([scaled(false)], D);
  const result = await action.execute(
    { serviceId: SVC, idleScaling: "false", confirmAlwaysOn: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(JSON.parse(calls[0].body!).idleScaling, false);
  assertEquals(result.alwaysOn, true);
  assertEquals(logs[0].level, "warn");
  assert(/bills around the clock/.test(logs[0].message), logs[0].message);
});

/** Zero means unchanged, so a partial scale does not reset the rest. */
Deno.test("service-scale: zeros are left unchanged rather than sent", async () => {
  const { ctx, calls } = mockCtx([scaled()], D);
  await action.execute({
    serviceId: SVC,
    minReplicaMemoryGb: 16,
    maxReplicaMemoryGb: 0,
    numReplicas: 0,
    idleTimeoutMinutes: 0,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.minReplicaMemoryGb, 16);
  assertEquals("maxReplicaMemoryGb" in body, false);
  assertEquals("numReplicas" in body, false);
  assertEquals("idleTimeoutMinutes" in body, false);
});

Deno.test("service-scale: a call with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([], D);
  let message = "";
  try {
    await action.execute({ serviceId: SVC }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-scale: says this is where the bill is decided", () => {
  assert(/where the bill is decided/.test(action.description!), action.description);
  assert(/only that direction is gated/.test(action.description!), action.description);
});
