import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/event-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("event-list: sends GET /events with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "event": "lead" }] }]);
  const out = await action.execute!({
    "event": "leads",
    "linkId": "link_1",
    "page": 2,
    "limit": 50,
    "sortOrder": "asc",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/events");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "event": "leads",
    "linkId": "link_1",
    "page": "2",
    "limit": "50",
    "sortOrder": "asc",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "events": [{ "event": "lead" }] });
});

Deno.test("event-list: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "event": "lead" }] }]);
  await action.execute!({
    "event": "leads",
    "linkId": "link_1",
    "page": 2,
    "limit": 50,
    "sortOrder": "asc",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("event-list: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "event": "leads",
        "linkId": "link_1",
        "page": 2,
        "limit": 50,
        "sortOrder": "asc",
      }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

Deno.test("event-list: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
