import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-event.ts";

test("delete-event: DELETEs /events/{id}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { deleted: true } }]);
  const out = await action.execute!({ eventId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/42/");
  assertEquals(out, { deleted: true });
});
