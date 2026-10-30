import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import searchAnswer from "../../actions/search-answer.ts";
import { mockCtx } from "../_helpers.ts";

test("search-answer: pins sourcedAnswer and offers inline citations", async () => {
  const a = mockCtx([{ body: { answer: "a", sources: [] } }]);
  assertEquals((await searchAnswer.execute({ q: "q", depth: "flash" }, a.ctx)).answer, "a");
  const body = JSON.parse(a.calls[0].body!);
  assertEquals(body.outputType, "sourcedAnswer");
  assertEquals(body.depth, "flash");
  assertEquals(searchAnswer.params!.some((p) => p.key === "includeInlineCitations"), true);
});
