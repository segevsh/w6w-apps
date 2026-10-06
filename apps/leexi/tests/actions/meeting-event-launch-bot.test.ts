import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/meeting-event-launch-bot.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("meeting-event-launch-bot: full input maps to POST /meeting_events/{uuid}/launch_bot", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa", "stop_task": true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/meeting_events/11111111-aaaa/launch_bot",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), { "stop_task": true });
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("meeting-event-launch-bot: required input only maps to POST /meeting_events/{uuid}/launch_bot", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "x1" }, "message": "ok" },
  }]);
  const out = await action.execute!({ "uuid": "11111111-aaaa" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://public-api.leexi.ai/v1/meeting_events/11111111-aaaa/launch_bot",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(decodeURIComponent(url.search), "");
  assertEquals(JSON.parse(calls[0].body!), {});
  assertEquals(out, { "data": { "uuid": "x1" }, "message": "ok" });
});

Deno.test("meeting-event-launch-bot: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {}, message: "ok" } }]);
  await action.execute!({ "uuid": "11111111-aaaa", "stop_task": true }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("meeting-event-launch-bot: surfaces a JSON error body as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "Name already taken" } }]);
  await assertRejects(
    async () => await action.execute!({ "uuid": "11111111-aaaa", "stop_task": true }, ctx),
    Error,
    "HTTP 422 — Name already taken",
  );
});

Deno.test("meeting-event-launch-bot: an empty 401 body still reads as an auth failure", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ "uuid": "11111111-aaaa", "stop_task": true }, ctx),
    Error,
    "HTTP 401 (API key ID/secret missing or invalid)",
  );
});

Deno.test("meeting-event-launch-bot: declares type, params and output", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.key, "meeting-event-launch-bot");
  assert(Array.isArray(action.output) && action.output.length > 0);
  assertEquals(action.params!.length, 2);
  assertEquals(action.idempotent, false);
});
