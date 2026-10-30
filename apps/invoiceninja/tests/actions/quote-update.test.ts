import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/quote-update.ts";

test("quote-update: PUTs /quotes/{id} with only the set fields", async () => {
  const { ctx, calls } = mockNinjaCtx([{ body: { id: "q1" } }]);
  await action.execute({ quoteId: "q1", dueDate: "2026-10-01" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.due_date, "2026-10-01");
  assertEquals("line_items" in body, false);
});
