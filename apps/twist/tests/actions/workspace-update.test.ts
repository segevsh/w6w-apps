import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import workspaceUpdate from "../../actions/workspace-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("workspace-update: POST /api/v3/workspaces/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUpdate.execute(
    { "workspaceId": 100, "name": "sample name" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "name": "sample name" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

test("workspace-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUpdate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

test("workspace-update: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUpdate.execute({ "workspaceId": 100 }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100" });
});

test("workspace-update: is declared idempotent", () => {
  assertEquals(workspaceUpdate.idempotent, true);
});

test("workspace-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUpdate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

test("workspace-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUpdate.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
