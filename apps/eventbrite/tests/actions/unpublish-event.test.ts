import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unpublish-event.ts";

Deno.test("unpublish-event: POSTs /events/{id}/unpublish/", async () => {
  const { ctx, calls } = mockCtx([{ body: { unpublished: true } }]);
  const out = await action.execute!({ eventId: "a/b" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/a%2Fb/unpublish/");
  assertEquals(calls[0].body, null);
  assertEquals(out, { unpublished: true });
});
