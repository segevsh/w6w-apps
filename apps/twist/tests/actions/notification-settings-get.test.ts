import { assert, assertEquals } from "@std/assert";
import notificationSettingsGet from "../../actions/notification-settings-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("notification-settings-get: GET /api/v3/notifications_settings/get with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await notificationSettingsGet.execute({ "workspaceId": 100 }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/notifications_settings/get");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(queryOf(calls[0].url), { "workspace_id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("notification-settings-get: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await notificationSettingsGet.execute({ "workspaceId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("notification-settings-get: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await notificationSettingsGet.execute({ "workspaceId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
