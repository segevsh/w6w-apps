import { assert, assertEquals } from "@std/assert";
import workspaceCreate from "../../actions/workspace-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-create: POST /api/v3/workspaces/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceCreate.execute(
    { "name": "sample name", "tempId": 101 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "name": "sample name", "temp_id": "101" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceCreate.execute({ "name": "sample name", "tempId": 101 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceCreate.execute({ "name": "sample name" }, ctx);

  assertEquals(formOf(calls[0].body), { "name": "sample name" });
});

Deno.test("workspace-create: is declared non-idempotent", () => {
  assertEquals(workspaceCreate.idempotent, false);
});

Deno.test("workspace-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceCreate.execute({ "name": "sample name", "tempId": 101 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceCreate.execute({ "name": "sample name" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
