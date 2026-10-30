import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-delete.ts";

const display = { endpoint: "https://example.com" };

test("entry-delete: DELETEs /api/<collection>/<id>", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: 1 } } }], { display });
  await action.execute({ collection: "articles", id: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/articles/1");
});

test("entry-delete: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
