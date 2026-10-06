import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-note-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-note-update: full input maps to PATCH /call_notes/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "uuid": "11111111-aaaa",
    "locale": "sample-locale",
    "text": "sample text",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/call_notes/11111111-aaaa",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "locale": "sample-locale", "text": "sample text" });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-note-update: required input only maps to PATCH /call_notes/{uuid}", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "uuid": "11111111-aaaa",
    "locale": "sample-locale",
    "text": "sample text",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/call_notes/11111111-aaaa",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "locale": "sample-locale", "text": "sample text" });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-note-update: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "uuid": "11111111-aaaa",
    "locale": "sample-locale",
    "text": "sample text",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("call-note-update: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "uuid": "11111111-aaaa",
        "locale": "sample-locale",
        "text": "sample text",
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("call-note-update: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "uuid": "11111111-aaaa",
        "locale": "sample-locale",
        "text": "sample text",
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("call-note-update: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "call-note-update");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 3);
  assertEquals(action.idempotent, true);
});
