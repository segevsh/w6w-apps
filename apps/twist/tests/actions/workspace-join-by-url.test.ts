import { assert, assertEquals } from "@std/assert";
import workspaceJoinByUrl from "../../actions/workspace-join-by-url.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-join-by-url: POST /api/v3/url_join/join_workspace with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceJoinByUrl.execute(
    { "urlInviteCode": "sample urlInviteCode" },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/url_join/join_workspace");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "url_invite_code": "sample urlInviteCode" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-join-by-url: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceJoinByUrl.execute({ "urlInviteCode": "sample urlInviteCode" }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-join-by-url: is declared idempotent", () => {
  assertEquals(workspaceJoinByUrl.idempotent, true);
});

Deno.test("workspace-join-by-url: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceJoinByUrl.execute({ "urlInviteCode": "sample urlInviteCode" }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-join-by-url: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceJoinByUrl.execute({ "urlInviteCode": "sample urlInviteCode" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
