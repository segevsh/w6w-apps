import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import viewUser from "../../actions/view-user.ts";
import { APP_ID, mockCtxWithConnection, pathOf } from "../_helpers.ts";

test("view-user: defaults the alias label to external_id", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { identity: {} } }]);
  await viewUser.execute({ aliasId: "user_123" }, ctx);
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/users/by/external_id/user_123`);
});

test("view-user: honours a custom alias label", async () => {
  const { ctx, calls } = mockCtxWithConnection([{ status: 200, body: { identity: {} } }]);
  await viewUser.execute({ aliasLabel: "onesignal_id", aliasId: "os-1" }, ctx);
  assertEquals(pathOf(calls[0].url), `/apps/${APP_ID}/users/by/onesignal_id/os-1`);
});
