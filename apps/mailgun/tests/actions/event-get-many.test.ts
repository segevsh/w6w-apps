import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-get-many.ts";

Deno.test("event-get-many: GETs /v3/{domain}/events with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    {
      domain: "mg.example.com",
      event: "delivered",
      begin: 100,
      end: 200,
      recipient: "a@b.com",
      limit: 50,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/mg.example.com/events");
  assertEquals(url.searchParams.get("event"), "delivered");
  assertEquals(url.searchParams.get("begin"), "100");
  assertEquals(url.searchParams.get("end"), "200");
  assertEquals(url.searchParams.get("recipient"), "a@b.com");
  assertEquals(url.searchParams.get("limit"), "50");
});

Deno.test("event-get-many: missing domain rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(async () => await action.execute!({ domain: "" }, ctx), Error, "`domain`");
});
