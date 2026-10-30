import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import articleGet from "../../actions/article-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("article-get: unwraps the documented single-element array response", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "e1", title: "Hello" }] }]);
  const out = await articleGet.execute({ entryId: "e1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/entries/e1");
  assertEquals(out, { id: "e1", title: "Hello" });
});

test("article-get: URL-encodes the entry id", async () => {
  const { ctx, calls } = mockCtx([{ body: [{}] }]);
  await articleGet.execute({ entryId: "a+b/c=d" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/entries/a%2Bb%2Fc%3Dd");
});

test("article-get: an empty array resolves to undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ body: [] }]);
  const out = await articleGet.execute({ entryId: "missing" }, ctx);
  assertEquals(out, undefined);
});
