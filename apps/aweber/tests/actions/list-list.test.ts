import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listList from "../../actions/list-list.ts";
import { entries, mockCtx, pathOf } from "../_helpers.ts";

test("list-list: lists the lists under an account", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1, name: "Newsletter" }]) }]);
  const out = await listList.execute({ accountId: "1" }, ctx) as { entries: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts/1/lists");
  assertEquals(out.entries.length, 1);
});
