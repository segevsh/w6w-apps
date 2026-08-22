import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-event-list.ts";

Deno.test("webhook-event-list: reads the event names webhook-create accepts", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: ["contract.created"] } }], {
    display: {},
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/webhooks/events/types");
});
