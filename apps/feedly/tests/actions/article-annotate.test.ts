import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import articleAnnotate from "../../actions/article-annotate.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("article-annotate: posts entryId and comment, without a highlight by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await articleAnnotate.execute({ entryId: "e1", comment: "Good article" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/annotations");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { entryId: "e1", comment: "Good article" });
});

test("article-annotate: includes a highlight only when all three fields are given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await articleAnnotate.execute(
    { entryId: "e1", comment: "Note", highlightStart: 0, highlightEnd: 4, highlightText: "this" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.highlight, { version: 1, start: 0, end: 4, text: "this" });
});

test("article-annotate: a partial highlight (missing text) is dropped, not sent malformed", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await articleAnnotate.execute(
    { entryId: "e1", comment: "Note", highlightStart: 0, highlightEnd: 4 },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals("highlight" in body, false);
});

test("article-annotate: is not idempotent", () => {
  assertEquals(articleAnnotate.idempotent, false);
});
