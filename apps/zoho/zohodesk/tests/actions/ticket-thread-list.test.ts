import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/ticket-thread-list.ts";

test("ticket-thread-list: GETs /tickets/{id}/threads", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ ticketId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/tickets/42/threads");
  assertEquals(out.data, [{ id: "1" }]);
});
