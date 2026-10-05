import { assertEquals, assertRejects } from "@std/assert";
import transcriptGet from "../../actions/transcript-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transcript-get: pages with cursor and page_size", async () => {
  const page = { transcript: [{ text: "hi" }], hasMore: true, cursor: "n" };
  const { ctx, calls } = mockCtx([{ body: page }]);
  const out = await transcriptGet.execute(
    { noteId: "not_1d3tmYTlCICgjy", cursor: "p", pageSize: 100 },
    ctx,
  );
  assertEquals(out, page);
  assertEquals(pathOf(calls[0].url), "/v1/notes/not_1d3tmYTlCICgjy/transcript");
  assertEquals(queryOf(calls[0].url), { cursor: "p", page_size: "100" });
});

Deno.test("transcript-get: errors surface the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { code: "NOT_FOUND", message: "gone" } }]);
  await assertRejects(
    async () => await transcriptGet.execute({ noteId: "not_x" }, ctx),
    Error,
    "gone",
  );
});
