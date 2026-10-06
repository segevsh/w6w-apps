import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cancel-event.ts";

Deno.test("cancel-event: POSTs /events/{id}/cancel/", async () => {
  const { ctx, calls } = mockCtx([{ body: { canceled: true } }]);
  const out = await action.execute!({ eventId: "a/b" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/a%2Fb/cancel/");
  assertEquals(calls[0].body, null);
  assertEquals(out, { canceled: true });
});
