import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-update.ts";

const state = (stateName: string) => ({ status: 200, body: { name: "prod", stateName } });
const patched = { status: 200, body: { name: "prod", stateName: "UPDATING" } };

Deno.test("cluster-update: reads the state first, then PATCHes", async () => {
  const { ctx, calls } = mockCtx([state("IDLE"), patched]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", instanceSize: "M20" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[1].method, "PATCH");
  assertEquals(result.stateName, "UPDATING");
  assertEquals(result.changed, ["replicationSpecs"]);
});

/** Atlas answers 409 during UPDATING; saying which state is more use. */
Deno.test("cluster-update: refuses while the cluster is not IDLE, before sending", async () => {
  for (const busy of ["UPDATING", "CREATING", "DELETING", "REPAIRING"]) {
    const { ctx, calls } = mockCtx([state(busy)]);
    let message = "";
    try {
      await action.execute({
        projectId: "5f8d0d55b54eff0f2b2c3d4e",
        cluster: "prod",
        backupEnabled: "true",
      }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(new RegExp(`is \\\`${busy}\\\``).test(message), message);
    assert(/only an IDLE cluster accepts one/.test(message), message);
    assertEquals(calls.length, 1, "the PATCH was not sent");
  }
});

Deno.test("cluster-update: a size becomes a replication spec", async () => {
  const { ctx, calls } = mockCtx([state("IDLE"), patched]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    cluster: "prod",
    instanceSize: "M30",
  }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.replicationSpecs[0].regionConfigs[0].electableSpecs.instanceSize, "M30");
});

/** Scaling rebuilds nodes with a primary election in the middle. */
Deno.test("cluster-update: a resize warns and other changes do not", async () => {
  const resize = mockCtx([state("IDLE"), patched]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    cluster: "prod",
    instanceSize: "M30",
  }, resize.ctx);
  assertEquals(resize.logs[0].level, "warn");
  assert(/primary election/.test(resize.logs[0].message), resize.logs[0].message);

  const quiet = mockCtx([state("IDLE"), patched]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    cluster: "prod",
    backupEnabled: "false",
  }, quiet.ctx);
  assertEquals(quiet.logs[0].level, "info");
});

/** Turning it off is the first half of deleting the cluster. */
Deno.test("cluster-update: removing termination protection needs an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute(
      { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", terminationProtection: "false" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/set `confirmUnprotect`/.test(message), message);
  assert(/first half of deleting/.test(message), message);
  assertEquals(calls.length, 0, "not even the state was read");
});

Deno.test("cluster-update: turning protection on is not gated", async () => {
  const { ctx, calls } = mockCtx([state("IDLE"), patched]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", terminationProtection: "true" },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).terminationProtectionEnabled, true);
});

Deno.test("cluster-update: unchanged selects are not sent", async () => {
  const { ctx, calls } = mockCtx([state("IDLE"), patched]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    cluster: "prod",
    backupEnabled: "true",
    terminationProtection: "",
  }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.backupEnabled, true);
  assertEquals("terminationProtectionEnabled" in body, false);
});

Deno.test("cluster-update: a PATCH with nothing in it is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/nothing to change/.test(message), message);
  assertEquals(calls.length, 0);
});
