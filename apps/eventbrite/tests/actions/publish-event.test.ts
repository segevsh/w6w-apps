import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/publish-event.ts";

Deno.test("publish-event: POSTs /events/{id}/publish/", async () => {
  const { ctx, calls } = mockCtx([{ body: { published: true } }]);
  const out = await action.execute!({ eventId: "a/b" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/a%2Fb/publish/");
  assertEquals(calls[0].body, null);
  assertEquals(out, { published: true });
});
