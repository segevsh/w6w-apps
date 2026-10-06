import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/meeting-event-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("meeting-event-list: full input maps to GET /meeting_events", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "data": [{ "uuid": "x1" }],
      "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
    },
  }]);
  const out = await action.execute!({
    "page": 2,
    "items": 2,
    "order": "created_at desc",
    "origin": "calendar",
    "date_filter": "start_time",
    "from": "sample-from",
    "to": "sample-to",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/meeting_events");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    decodeURIComponent(url.search),
    "?page=2&items=2&order=created_at desc&origin=calendar&date_filter=start_time&from=sample-from&to=sample-to",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, {
    "data": [{ "uuid": "x1" }],
    "pagination": { "page": 1, "items": 10, "count": 1, "pages": 1 },
  });
});

Deno.test("meeting-event-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "page": 2,
    "items": 2,
    "order": "created_at desc",
    "origin": "calendar",
    "date_filter": "start_time",
    "from": "sample-from",
    "to": "sample-to",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("meeting-event-list: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "page": 2,
        "items": 2,
        "order": "created_at desc",
        "origin": "calendar",
        "date_filter": "start_time",
        "from": "sample-from",
        "to": "sample-to",
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("meeting-event-list: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "page": 2,
        "items": 2,
        "order": "created_at desc",
        "origin": "calendar",
        "date_filter": "start_time",
        "from": "sample-from",
        "to": "sample-to",
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("meeting-event-list: declares type, params and output", () => {
  assertEquals(action.type, "search");
  assertEquals(action.key, "meeting-event-list");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 7);
});
