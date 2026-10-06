import { assert, assertEquals } from "@std/assert";
import workspaceUserInviteResend from "../../actions/workspace-user-invite-resend.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-user-invite-resend: POST /api/v4/workspace_users/resend_invite with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await workspaceUserInviteResend.execute({
    "workspaceId": 100,
    "email": "sample email",
    "userId": 102,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v4/workspace_users/resend_invite");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100", "email": "sample email", "user_id": "102" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("workspace-user-invite-resend: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserInviteResend.execute({
    "workspaceId": 100,
    "email": "sample email",
    "userId": 102,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("workspace-user-invite-resend: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserInviteResend.execute({ "workspaceId": 100, "email": "sample email" }, ctx);

  assertEquals(formOf(calls[0].body), { "id": "100", "email": "sample email" });
});

Deno.test("workspace-user-invite-resend: is declared non-idempotent", () => {
  assertEquals(workspaceUserInviteResend.idempotent, false);
});

Deno.test("workspace-user-invite-resend: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await workspaceUserInviteResend.execute({
    "workspaceId": 100,
    "email": "sample email",
    "userId": 102,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("workspace-user-invite-resend: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await workspaceUserInviteResend.execute({ "workspaceId": 100, "email": "sample email" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
