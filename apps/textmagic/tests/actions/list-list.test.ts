import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import listList from "../../actions/list-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

test("list-list: GETs /lists with filters", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 715 }]) }]);
  await listList.execute({ favoriteOnly: 1, onlyMine: 1 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/lists");
  assertEquals(queryOf(calls[0].url), { favoriteOnly: "1", onlyMine: "1" });
});
