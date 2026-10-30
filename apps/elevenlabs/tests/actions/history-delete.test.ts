import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import historyDelete from "../../actions/history-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("history-delete: issues a DELETE against the history item", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "ok" } }]);
  const out = await historyDelete.execute({ historyItemId: "h1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/history/h1");
  assertEquals(out, { status: "ok" });
});

test("history-delete: is an idempotent perform — deleting twice changes nothing", () => {
  assertEquals(historyDelete.type, "perform");
  assertEquals(historyDelete.idempotent, true);
});
