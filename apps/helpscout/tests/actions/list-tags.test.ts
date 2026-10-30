import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tags.ts";

test("list-tags: GETs /tags and unwraps _embedded.tags", async () => {
  const { ctx, calls } = mockCtx([{
    body: { _embedded: { tags: [{ id: 1, name: "Dark Side" }] } },
  }]);
  const out = await action.execute({ page: 1 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tags");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(out, { tags: [{ id: 1, name: "Dark Side" }] });
});

test("list-tags: returns an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute({}, ctx), { tags: [] });
});
