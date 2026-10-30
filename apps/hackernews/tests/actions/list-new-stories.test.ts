import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-new-stories.ts";

test("list-new-stories: GETs /v0/newstories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [49575769, 49575766] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/newstories.json");
  assertEquals(out.ids, [49575769, 49575766]);
});
