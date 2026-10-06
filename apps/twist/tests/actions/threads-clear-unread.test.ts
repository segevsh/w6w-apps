import { assert, assertEquals } from "@std/assert";
import threadsClearUnread from "../../actions/threads-clear-unread.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("threads-clear-unread: POST /api/v3/threads/clear_unread with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await threadsClearUnread.execute({ "workspaceId": 100 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/threads/clear_unread");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "workspace_id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("threads-clear-unread: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadsClearUnread.execute({ "workspaceId": 100 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("threads-clear-unread: is declared idempotent", () => {
  assertEquals(threadsClearUnread.idempotent, true);
});

Deno.test("threads-clear-unread: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await threadsClearUnread.execute({ "workspaceId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("threads-clear-unread: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await threadsClearUnread.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
