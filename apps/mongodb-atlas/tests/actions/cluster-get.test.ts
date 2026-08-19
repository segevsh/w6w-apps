import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cluster-get.ts";

const cluster = (attributes: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    name: "prod",
    stateName: "IDLE",
    paused: false,
    mongoDBVersion: "8.0.4",
    backupEnabled: true,
    connectionStrings: { standardSrv: "mongodb+srv://prod.abcde.mongodb.net" },
    ...attributes,
  },
});

Deno.test("cluster-get: reads one cluster by name", async () => {
  const { ctx, calls } = mockCtx([cluster({ terminationProtectionEnabled: true })]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://cloud.mongodb.com/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/clusters/prod",
  );
  assertEquals(result.stateName, "IDLE");
  assertEquals(result.mongoDBVersion, "8.0.4");
});

/** Three separate things must line up before an application can connect. */
Deno.test("cluster-get: surfaces the connection host, which carries no credentials", async () => {
  const { ctx } = mockCtx([cluster()]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.srv, "mongodb+srv://prod.abcde.mongodb.net");
  assertEquals(String(result.srv).includes("@"), false, "no credentials in the SRV host");
  assert(/carries NO credentials/.test(action.description!), action.description);
});

/** Off is Atlas's default, and the wrong one for anything holding data. */
Deno.test("cluster-get: notes when termination protection is off", async () => {
  const off = mockCtx([cluster({ terminationProtectionEnabled: false })]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    off.ctx,
  ) as Record<string, unknown>;
  assertEquals(result.terminationProtection, false);
  assert(/termination protection OFF/.test(off.logs[0].message), off.logs[0].message);

  const on = mockCtx([cluster({ terminationProtectionEnabled: true })]);
  const protectedResult = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "prod" },
    on.ctx,
  ) as Record<string, unknown>;
  assertEquals(protectedResult.terminationProtection, true);
  assertEquals(on.logs.length, 0);
});

Deno.test("cluster-get: a name is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`cluster` is required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("cluster-get: a name needing escaping is encoded into the path", async () => {
  const { ctx, calls } = mockCtx([cluster()]);
  await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e", cluster: "my cluster" }, ctx);
  assert(calls[0].url.endsWith("/clusters/my%20cluster"), calls[0].url);
});
