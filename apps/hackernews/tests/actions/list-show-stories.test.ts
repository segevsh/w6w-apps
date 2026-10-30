import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-show-stories.ts";

test("list-show-stories: GETs /v0/showstories.json and wraps the id array", async () => {
  const { ctx, calls } = mockCtx([{ body: [49567437, 49562219] }]);
  const out = await action.execute({}, ctx);

  assertEquals(calls[0].url, "https://hacker-news.firebaseio.com/v0/showstories.json");
  assertEquals(out.ids, [49567437, 49562219]);
});
