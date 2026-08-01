import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/track-anonymous.ts";

Deno.test("track-anonymous: posts name + anonymous_id + data to /events", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { anonymousId: "anon-1", eventName: "updated", data: { plan: "free" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/events");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "updated",
    data: { plan: "free" },
    anonymous_id: "anon-1",
  });
  assertEquals(result, { success: true });
});

Deno.test("track-anonymous: omits anonymous_id when blank (anonymous invite event shape)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { eventName: "invite", data: { name: "Alex", recipient: "alex@example.com" } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    name: "invite",
    data: { name: "Alex", recipient: "alex@example.com" },
  });
});

Deno.test("track-anonymous: rejects a blank eventName", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ eventName: "" }, ctx),
    Error,
    "`eventName` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("track-anonymous: uses the eu host when the connection's region is eu", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    connection: { display: { region: "eu" } },
  });
  await action.execute!({ eventName: "e" }, ctx);
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/events");
});
