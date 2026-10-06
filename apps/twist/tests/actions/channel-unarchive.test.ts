import { assert, assertEquals } from "@std/assert";
import channelUnarchive from "../../actions/channel-unarchive.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-unarchive: POST /api/v3/channels/unarchive with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelUnarchive.execute({ "channelId": 100 }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/unarchive");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-unarchive: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUnarchive.execute({ "channelId": 100 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-unarchive: is declared idempotent", () => {
  assertEquals(channelUnarchive.idempotent, true);
});

Deno.test("channel-unarchive: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelUnarchive.execute({ "channelId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-unarchive: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelUnarchive.execute({ "channelId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
