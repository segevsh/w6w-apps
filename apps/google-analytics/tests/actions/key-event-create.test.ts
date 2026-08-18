import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/key-event-create.ts";

const display = { propertyId: "123" };

Deno.test("key-event-create: marks an event name as a key event", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { eventName: "purchase" } }], { display });
  await action.execute!({ eventName: "purchase" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/properties/123/keyEvents");
  assertEquals(JSON.parse(calls[0].body!), {
    eventName: "purchase",
    countingMethod: "ONCE_PER_EVENT",
  });
});

Deno.test("key-event-create: an event name is required", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`eventName`");
  assertEquals(calls.length, 0);
});
