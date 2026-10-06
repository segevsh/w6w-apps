import { assert, assertEquals } from "@std/assert";
import urlJoinGet from "../../actions/url-join-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("url-join-get: GET /api/v3/url_join/get_only with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await urlJoinGet.execute({ "workspaceId": 100 }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/url_join/get_only");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "workspace_id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("url-join-get: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await urlJoinGet.execute({ "workspaceId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("url-join-get: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await urlJoinGet.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
