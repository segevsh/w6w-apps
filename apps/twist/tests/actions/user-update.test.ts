import { assert, assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-update: POST /api/v3/users/update with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  const out = await userUpdate.execute({
    "name": "sample name",
    "email": "sample email",
    "defaultWorkspace": 102,
    "profession": "sample profession",
    "contactInfo": "sample contactInfo",
    "timezone": "sample timezone",
    "snoozeUntil": 106,
    "snoozeDndStart": "sample snoozeDndStart",
    "snoozeDndEnd": "sample snoozeDndEnd",
    "offDays": "1, 2",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/users/update");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), {
    "name": "sample name",
    "email": "sample email",
    "default_workspace": "102",
    "profession": "sample profession",
    "contact_info": "sample contactInfo",
    "timezone": "sample timezone",
    "snooze_until": "106",
    "snooze_dnd_start": "sample snoozeDndStart",
    "snooze_dnd_end": "sample snoozeDndEnd",
    "off_days": "[1,2]",
  });
  assertEquals(out, { "id": 7, "name": "Ada", "email": "ada@example.com" });
});

Deno.test("user-update: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  await userUpdate.execute({
    "name": "sample name",
    "email": "sample email",
    "defaultWorkspace": 102,
    "profession": "sample profession",
    "contactInfo": "sample contactInfo",
    "timezone": "sample timezone",
    "snoozeUntil": 106,
    "snoozeDndStart": "sample snoozeDndStart",
    "snoozeDndEnd": "sample snoozeDndEnd",
    "offDays": "1, 2",
  }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("user-update: omits optional parameters that are not set", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  await userUpdate.execute({}, ctx);

  assertEquals(formOf(calls[0].body), {});
});

Deno.test("user-update: is declared idempotent", () => {
  assertEquals(userUpdate.idempotent, true);
});

Deno.test("user-update: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  await userUpdate.execute({
    "name": "sample name",
    "email": "sample email",
    "defaultWorkspace": 102,
    "profession": "sample profession",
    "contactInfo": "sample contactInfo",
    "timezone": "sample timezone",
    "snoozeUntil": 106,
    "snoozeDndStart": "sample snoozeDndStart",
    "snoozeDndEnd": "sample snoozeDndEnd",
    "offDays": "1, 2",
  }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("user-update: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await userUpdate.execute({}, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});

Deno.test("user-update: never returns the user's API token", async () => {
  const { ctx } = mockCtx([{
    body: { "id": 7, "name": "Ada", "email": "ada@example.com", "token": "SECRET-TOKEN" },
  }]);
  const out = await userUpdate.execute({}, ctx) as Record<string, unknown>;

  assertEquals("token" in out, false);
  assertEquals(JSON.stringify(out).includes("SECRET-TOKEN"), false);
});
