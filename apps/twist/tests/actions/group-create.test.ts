import { assert, assertEquals } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("group-create: POST /api/v3/groups/add with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await groupCreate.execute({
    "workspaceId": 100,
    "name": "sample name",
    "userIds": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/groups/add");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "workspace_id": "100",
    "name": "sample name",
    "user_ids": "[1,2]",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("group-create: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await groupCreate.execute({ "workspaceId": 100, "name": "sample name", "userIds": "1, 2" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("group-create: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await groupCreate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);

  assertEquals(formOf(calls[0].body), { "workspace_id": "100", "name": "sample name" });
});

Deno.test("group-create: is declared non-idempotent", () => {
  assertEquals(groupCreate.idempotent, false);
});

Deno.test("group-create: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await groupCreate.execute({ "workspaceId": 100, "name": "sample name", "userIds": "1, 2" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("group-create: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await groupCreate.execute({ "workspaceId": 100, "name": "sample name" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
