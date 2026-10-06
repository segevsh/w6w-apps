import { assert, assertEquals, assertRejects } from "@std/assert";
import eventTrack from "../../actions/event-track.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("event-track: POSTs id and event to /v1/track-event", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  assertEquals(await eventTrack.execute({ id: "u1", event: "Upgraded" }, ctx), { message: "ok" });
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/track-event");
  assertEquals(JSON.parse(calls[0].body!), { id: "u1", event: "Upgraded" });
});

Deno.test("event-track: needs an id or an email", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(eventTrack.execute({ event: "x" }, ctx)),
    Error,
    "user id or an email",
  );
  assertEquals(calls.length, 0);
});

Deno.test("event-track: is not idempotent", () => assertEquals(eventTrack.idempotent, false));

Deno.test("event-track: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(eventTrack.execute({ id: "u1", event: "x" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
