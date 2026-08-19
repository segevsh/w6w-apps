import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/database-user-delete.ts";

Deno.test("database-user-delete: deletes at the two-part identity path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", username: "app", confirmUsername: "app" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/databaseUsers/admin/app",
  );
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result.deleted, true);
  assertEquals(result.databaseName, "admin");
});

Deno.test("database-user-delete: a non-default auth database goes into the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({
    projectId: "5f8d0d55b54eff0f2b2c3d4e",
    username: "svc",
    databaseName: "$external",
    confirmUsername: "svc",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/databaseUsers/%24external/svc",
  );
});

/** The mistake surfaces later, at somebody else's reconnection. */
Deno.test("database-user-delete: the username must be typed back", async () => {
  for (const confirm of [undefined, "", "APP", "app2"]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute(
        { projectId: "5f8d0d55b54eff0f2b2c3d4e", username: "app", confirmUsername: confirm },
        ctx,
      );
    } catch (err) {
      message = String(err);
    }
    assert(/`confirmUsername` must match/.test(message), `${confirm}: ${message}`);
    assert(/at its next reconnection rather than immediately/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

/** Revoking a user does not close the connections already authenticated. */
Deno.test("database-user-delete: warns that existing connections keep working", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await action.execute(
    { projectId: "5f8d0d55b54eff0f2b2c3d4e", username: "app", confirmUsername: "app" },
    ctx,
  );
  assertEquals(logs[0].level, "warn");
  assert(/until they reconnect/.test(logs[0].message), logs[0].message);
  assert(/EXISTING CONNECTIONS ARE NOT CLOSED/.test(action.description!), action.description);
});

Deno.test("database-user-delete: a username is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ projectId: "5f8d0d55b54eff0f2b2c3d4e" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`username` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
