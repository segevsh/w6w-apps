import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/call-note-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("call-note-list: full input maps to GET /call_notes", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [{ "uuid": "x1" }],
      "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
    },
  }]);
  const out = await action.execute!({
    "call_uuid": "sample-call_uuid",
    "prompt_uuid": "sample-prompt_uuid",
    "page": 2,
    "items": 2,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/call_notes");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    decodeURIComponent(url.search),
    "?call_uuid=sample-call_uuid&prompt_uuid=sample-prompt_uuid&page=2&items=2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "uuid": "x1" }],
    "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
  });
});

Deno.test("call-note-list: required input only maps to GET /call_notes", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [{ "uuid": "x1" }],
      "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
    },
  }]);
  const out = await action.execute!({ "call_uuid": "sample-call_uuid" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/call_notes");
  assertEquals(calls[0].method, "GET");
  assertEquals(decodeURIComponent(url.search), "?call_uuid=sample-call_uuid");
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "uuid": "x1" }],
    "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
  });
});

Deno.test("call-note-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "call_uuid": "sample-call_uuid",
    "prompt_uuid": "sample-prompt_uuid",
    "page": 2,
    "items": 2,
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("call-note-list: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "call_uuid": "sample-call_uuid",
        "prompt_uuid": "sample-prompt_uuid",
        "page": 2,
        "items": 2,
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("call-note-list: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "call_uuid": "sample-call_uuid",
        "prompt_uuid": "sample-prompt_uuid",
        "page": 2,
        "items": 2,
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("call-note-list: declares type, params and output", () => {
  assertEquals(action.type, "search");
  assertEquals(action.key, "call-note-list");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 4);
});
