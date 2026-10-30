import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/inbox-list.ts";

test("inbox-list: reads /inboxes and returns the results", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _results: [{ id: "inb_1", name: "Support" }] },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "inb_1", name: "Support" }]);
  assertEquals(new URL(calls[0].url).pathname, "/inboxes");
});

/** This collection has no cursor, so one request is the whole answer. */
test("inbox-list: does not page a collection Front does not paginate", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [{ id: "inb_1" }] } }]);
  await action.execute!({ returnAll: true }, ctx);
  assertEquals(calls.length, 1);
});
