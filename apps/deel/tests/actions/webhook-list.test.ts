import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-list.ts";

Deno.test("webhook-list: lists registered webhooks", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "w1" }], page: {} } }], {
    display: {},
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/webhooks");
  assertEquals(result, [{ id: "w1" }]);
});
