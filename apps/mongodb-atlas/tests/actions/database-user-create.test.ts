import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/database-user-create.ts";

const listing = (users: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { results: users },
});

const written = { status: 201, body: { username: "app", scopes: [] } };

const base = {
  projectId: "5f8d0d55b54eff0f2b2c3d4e",
  username: "app",
  password: "s3cr3t",
  roles: '[{"roleName":"readWrite","databaseName":"app"}]',
};

Deno.test("database-user-create: POSTs when the user is absent", async () => {
  const { ctx, calls } = mockCtx([listing([]), written]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[1].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/databaseUsers",
  );
  assertEquals(calls[1].method, "POST");
  assertEquals(result.created, true);
});

/** Username and authentication database together are the identity. */
Deno.test("database-user-create: PATCHes an existing user at its two-part path", async () => {
  const { ctx, calls } = mockCtx([
    listing([{ username: "app", databaseName: "admin" }]),
    written,
  ]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(
    new URL(calls[1].url).pathname,
    "/api/atlas/v2/groups/5f8d0d55b54eff0f2b2c3d4e/databaseUsers/admin/app",
  );
  assertEquals(calls[1].method, "PATCH");
  assertEquals(result.created, false);
});

Deno.test("database-user-create: the same name in another auth database is a different user", async () => {
  const { ctx, calls } = mockCtx([
    listing([{ username: "app", databaseName: "$external" }]),
    written,
  ]);
  const result = await action.execute(base, ctx) as Record<string, unknown>;
  assertEquals(calls[1].method, "POST");
  assertEquals(result.created, true);
});

/** Atlas never returns a password, so this app does not generate one. */
Deno.test("database-user-create: refuses without a password, explaining why", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, password: "" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/does not generate/.test(message), message);
  assert(/hand back through a workflow's data/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("database-user-create: roles must be a non-empty array", async () => {
  for (const roles of [undefined, "", "[]", '{"roleName":"read"}']) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await action.execute({ ...base, roles }, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/non-empty array/.test(message), `${roles}: ${message}`);
    assertEquals(calls.length, 0);
  }
});

/** Scopes are what stop a credential reaching everything the project holds. */
Deno.test("database-user-create: scopes become cluster entries and are warned about when absent", async () => {
  const scoped = mockCtx([listing([]), written]);
  const result = await action.execute({ ...base, scopes: "prod, staging" }, scoped.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(JSON.parse(scoped.calls[1].body!).scopes, [
    { name: "prod", type: "CLUSTER" },
    { name: "staging", type: "CLUSTER" },
  ]);
  assertEquals(result.scoped, true);
  assertEquals(scoped.logs[0].level, "info");

  const open = mockCtx([listing([]), written]);
  const unscoped = await action.execute(base, open.ctx) as Record<string, unknown>;
  assertEquals("scopes" in JSON.parse(open.calls[1].body!), false);
  assertEquals(unscoped.scoped, false);
  assertEquals(open.logs[0].level, "warn");
  assert(/NO cluster scope/.test(open.logs[0].message), open.logs[0].message);
});

/** The password is the only copy leaving this system. */
Deno.test("database-user-create: never logs the password", async () => {
  const { ctx, logs } = mockCtx([listing([]), written]);
  await action.execute({ ...base, scopes: "prod" }, ctx);
  const data = JSON.stringify(logs[0]);
  assertEquals(data.includes("s3cr3t"), false);
  assertEquals(logs[0].data, { username: "app", scoped: true });
});

Deno.test("database-user-create: the auth database defaults to admin and is sent", async () => {
  const { ctx, calls } = mockCtx([listing([]), written]);
  await action.execute(base, ctx);
  assertEquals(JSON.parse(calls[1].body!).databaseName, "admin");
});

Deno.test("database-user-create: a username is required", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await action.execute({ ...base, username: "" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/`username` is required/.test(message), message);
  assertEquals(calls.length, 0);
});
