import { assertEquals } from "@std/assert";
import action from "../../actions/article-list.ts";
import { mockCtx, PAGE, pathOf, queryOf } from "../_helpers.ts";

Deno.test("article-list: maps filters and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await action.execute(
    { articleNumber: "LXW-1", gtin: "9783648170632", type: "SERVICE", page: 1, size: 50 },
    ctx,
  ) as { totalElements: number };
  assertEquals(pathOf(calls[0].url), "/v1/articles");
  assertEquals(queryOf(calls[0].url), {
    articleNumber: "LXW-1",
    gtin: "9783648170632",
    type: "SERVICE",
    page: "1",
    size: "50",
  });
  assertEquals(out.totalElements, 1);
});
