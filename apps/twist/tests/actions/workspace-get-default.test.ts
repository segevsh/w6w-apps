import { assert, assertEquals } from "@std/assert";
import workspaceGetDefault from "../../actions/workspace-get-default.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("workspace-get-default: GET /api/v3/workspaces/get_default with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceGetDefault.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/workspaces/get_default");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-get-default: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceGetDefault.execute({}, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-get-default: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceGetDefault.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
