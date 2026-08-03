import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getSubscriber from "../../actions/get-subscriber.ts";

Deno.test("get-subscriber: puts subscriber_id on the query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: { id: "1" } } }]);
  await getSubscriber.execute!({ subscriberId: "1234567890123456" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/fb/subscriber/getInfo");
  assertEquals(url.searchParams.get("subscriber_id"), "1234567890123456");
});

Deno.test("get-subscriber: an id beyond 2^53 survives unmangled", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: {} } }]);
  await getSubscriber.execute!({ subscriberId: "9007199254740993" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("subscriber_id"), "9007199254740993");
});

Deno.test("get-subscriber: surfaces last_interaction, the 24-hour-window clock", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        status: "success",
        data: { id: "1", last_interaction: "2026-08-01T00:00:00+00:00", ig_username: "acme" },
      },
    },
  ]);
  const out = await getSubscriber.execute!({ subscriberId: "1" }, ctx) as {
    data: { last_interaction: string; ig_username: string };
  };
  assertEquals(out.data.last_interaction, "2026-08-01T00:00:00+00:00");
  assertEquals(out.data.ig_username, "acme");
});

Deno.test("get-subscriber: null last_interaction is passed through, not coerced", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: { id: "1", last_interaction: null } } },
  ]);
  const out = await getSubscriber.execute!({ subscriberId: "1" }, ctx) as {
    data: { last_interaction: unknown };
  };
  assertEquals(out.data.last_interaction, null);
});
