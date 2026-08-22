import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/broadcast-send.ts";

const display = {};

Deno.test("broadcast-send: sends now when no time is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "b_1" } }], { display });
  await action.execute!({ broadcastId: "b_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.resend.com/broadcasts/b_1/send");
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("broadcast-send: a time schedules it instead", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ broadcastId: "b_1", scheduledAt: "in 1 hour" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { scheduled_at: "in 1 hour" });
});

Deno.test("broadcast-send: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`broadcastId`");
  assertEquals(calls.length, 0);
});
