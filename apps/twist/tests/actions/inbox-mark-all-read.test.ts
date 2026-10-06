import { assert, assertEquals } from "@std/assert";
import inboxMarkAllRead from "../../actions/inbox-mark-all-read.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("inbox-mark-all-read: POST /api/v3/inbox/mark_all_read with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await inboxMarkAllRead.execute({ "workspaceId": 100 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/inbox/mark_all_read");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "workspace_id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("inbox-mark-all-read: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await inboxMarkAllRead.execute({ "workspaceId": 100 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("inbox-mark-all-read: is declared idempotent", () => {
  assertEquals(inboxMarkAllRead.idempotent, true);
});

Deno.test("inbox-mark-all-read: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await inboxMarkAllRead.execute({ "workspaceId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("inbox-mark-all-read: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await inboxMarkAllRead.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
