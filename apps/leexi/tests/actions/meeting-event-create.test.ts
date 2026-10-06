import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/meeting-event-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("meeting-event-create: full input maps to POST /meeting_events", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "meeting_url": "sample-meeting_url",
    "user_uuid": "sample-user_uuid",
    "start_time": "sample-start_time",
    "end_time": "sample-end_time",
    "organizer": "sample-organizer",
    "to_record": true,
    "internal": true,
    "owned": true,
    "title": "sample-title",
    "description": "sample description",
    "direction": "inbound",
    "attendees": ["a1", "b2"],
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/meeting_events");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "meeting_url": "sample-meeting_url",
    "user_uuid": "sample-user_uuid",
    "start_time": "sample-start_time",
    "end_time": "sample-end_time",
    "organizer": "sample-organizer",
    "to_record": true,
    "internal": true,
    "owned": true,
    "title": "sample-title",
    "description": "sample description",
    "direction": "inbound",
    "attendees": ["a1", "b2"],
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("meeting-event-create: required input only maps to POST /meeting_events", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({
    "meeting_url": "sample-meeting_url",
    "user_uuid": "sample-user_uuid",
    "start_time": "sample-start_time",
    "end_time": "sample-end_time",
    "organizer": "sample-organizer",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://public-api.leexi.ai/v1/meeting_events");
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {
    "meeting_url": "sample-meeting_url",
    "user_uuid": "sample-user_uuid",
    "start_time": "sample-start_time",
    "end_time": "sample-end_time",
    "organizer": "sample-organizer",
    "to_record": false,
    "internal": false,
    "owned": false,
  });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("meeting-event-create: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({
    "meeting_url": "sample-meeting_url",
    "user_uuid": "sample-user_uuid",
    "start_time": "sample-start_time",
    "end_time": "sample-end_time",
    "organizer": "sample-organizer",
    "to_record": true,
    "internal": true,
    "owned": true,
    "title": "sample-title",
    "description": "sample description",
    "direction": "inbound",
    "attendees": ["a1", "b2"],
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("meeting-event-create: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "meeting_url": "sample-meeting_url",
        "user_uuid": "sample-user_uuid",
        "start_time": "sample-start_time",
        "end_time": "sample-end_time",
        "organizer": "sample-organizer",
        "to_record": true,
        "internal": true,
        "owned": true,
        "title": "sample-title",
        "description": "sample description",
        "direction": "inbound",
        "attendees": ["a1", "b2"],
      }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("meeting-event-create: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "meeting_url": "sample-meeting_url",
        "user_uuid": "sample-user_uuid",
        "start_time": "sample-start_time",
        "end_time": "sample-end_time",
        "organizer": "sample-organizer",
        "to_record": true,
        "internal": true,
        "owned": true,
        "title": "sample-title",
        "description": "sample description",
        "direction": "inbound",
        "attendees": ["a1", "b2"],
      }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("meeting-event-create: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "meeting-event-create");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 12);
  assertEquals(action.idempotent, false);
});
