import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-delete.ts";

const cluster = (protectionOn: boolean) => ({
  status: 200,
  body: { name: "prod", terminationProtectionEnabled: protectionOn },
});

Deno.test("cluster-delete: reads the cluster, then DELETEs it", async () => {
  const { ctx, calls } = mockCtx([cluster(false), { status: 202, body: {} }]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", confirmName: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(
    new URL(calls[1].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/clusters/prod",
  );
  assertEquals(result.deleted, true);
});

/** The mechanism worth relying on, so the refusal explains itself here. */
Deno.test("cluster-delete: respects termination protection before calling", async () => {
  const { ctx, calls } = mockCtx([cluster(true)]);
  let message = "";
  try {
    await action.execute(
      { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", confirmName: "prod" },
      ctx,
    );
  } catch (err) {
    message = String(err);
  }
  assert(/has termination protection on/.test(message), message);
  assert(/`cluster-update` does it, and asks/.test(message), message);
  assertEquals(calls.length, 1, "the DELETE was not sent");
});

Deno.test("cluster-delete: the name must be typed back exactly", async () => {
  for (const confirm of [undefined, "", "PROD", "prod2"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute(
        { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", confirmName: confirm },
        ctx,
      );
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmName` must match/.test(message), `${confirm}: ${message}`);
    assertEquals(calls.length, 0, "the cluster was not even read");
  }
});

/** Off, the snapshots go too and no copy of the data is left anywhere. */
Deno.test("cluster-delete: keeps the backups by default", async () => {
  const kept = mockCtx([cluster(false), { status: 202, body: {} }]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod", confirmName: "prod" },
    kept.ctx,
  );
  assertEquals(new URL(kept.calls[1].url).searchParams.get("retainBackups"), "true");
  assertEquals(action.params!.find((p) => p.key === "retainBackups")!.default, true);

  const dropped = mockCtx([cluster(false), { status: 202, body: {} }]);
  const result = await action.execute(
    {
      projectId: "5f8d0d55b54eff0f2b2c3d4e",
      cluster: "prod",
      confirmName: "prod",
      retainBackups: false,
    },
    dropped.ctx,
  ) as Record<string, unknown>;
  assertEquals(new URL(dropped.calls[1].url).searchParams.get("retainBackups"), "false");
  assertEquals(result.retainedBackups, false);
});

Deno.test("cluster-delete: warns that the data is gone", async () => {
  const { ctx, logs } = mockCtx([cluster(false), { status: 202, body: {} }]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    cluster: "prod",
    confirmName: "prod",
  }, ctx);
  assertEquals(logs[0].level, "warn");
  assert(/the data is gone/.test(logs[0].message), logs[0].message);
});

Deno.test("cluster-delete: says Atlas refuses this while protection is on", () => {
  assert(
    /REFUSES this while termination protection is on/.test(action.description!),
    action.description,
  );
  assertEquals(action.idempotent, true);
});
