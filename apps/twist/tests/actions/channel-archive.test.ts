import { assert, assertEquals } from "@std/assert";
import channelArchive from "../../actions/channel-archive.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("channel-archive: POST /api/v3/channels/archive with every documented parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  const out = await channelArchive.execute({ "channelId": 100 }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/channels/archive");
  assertEquals(calls[0].url.startsWith("https://api.twist.com/"), true);
  assertEquals(formOf(calls[0].body), { "id": "100" });
  assertEquals(out, { "id": 7, "name": "Sample" });
});

Deno.test("channel-archive: sends a form body, never a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelArchive.execute({ "channelId": 100 }, ctx);

  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("channel-archive: is declared idempotent", () => {
  assertEquals(channelArchive.idempotent, true);
});

Deno.test("channel-archive: sends no credential of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 7, "name": "Sample" } }]);
  await channelArchive.execute({ "channelId": 100 }, ctx);

  assert(!("authorization" in calls[0].headers));
});

Deno.test("channel-archive: surfaces Twist's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error_code: 110, error_string: "Resource not found", error_extra: {}, error_uuid: "u" },
  }]);
  let message = "";
  try {
    await channelArchive.execute({ "channelId": 100 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "Twist error 110: Resource not found (HTTP 404)");
});
