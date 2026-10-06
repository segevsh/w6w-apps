import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-presign-recording.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-presign-recording: full input maps to POST /calls/presign_recording_url", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "extension": "sample-extension" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/calls/presign_recording_url",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "extension": "sample-extension" });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-presign-recording: required input only maps to POST /calls/presign_recording_url", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "extension": "sample-extension" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/calls/presign_recording_url",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "extension": "sample-extension" });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("call-presign-recording: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "extension": "sample-extension" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("call-presign-recording: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "extension": "sample-extension" }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("call-presign-recording: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "extension": "sample-extension" }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("call-presign-recording: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "call-presign-recording");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 1);
  assertEquals(action.idempotent, false);
});
