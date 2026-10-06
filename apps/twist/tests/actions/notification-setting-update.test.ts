import { assert, assertEquals } from "@std/assert";
import notificationSettingUpdate from "../../actions/notification-setting-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("notification-setting-update: POST /api/v3/notifications_settings/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await notificationSettingUpdate.execute({
    "workspaceId": 100,
    "setting": "sample setting",
    "value": true,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/notifications_settings/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "workspace_id": "100",
    "setting": "sample setting",
    "value": "true",
  });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("notification-setting-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await notificationSettingUpdate.execute({
    "workspaceId": 100,
    "setting": "sample setting",
    "value": true,
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("notification-setting-update: is declared idempotent", () => {
  assertEquals(notificationSettingUpdate.idempotent, true);
});

Deno.test("notification-setting-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await notificationSettingUpdate.execute({
    "workspaceId": 100,
    "setting": "sample setting",
    "value": true,
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("notification-setting-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await notificationSettingUpdate.execute({
      "workspaceId": 100,
      "setting": "sample setting",
      "value": true,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
