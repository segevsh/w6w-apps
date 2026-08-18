import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-get.ts";

const conn = { display: { projectId: "abc123", dataset: "production" } };

Deno.test("document-get: fetches several ids in one call", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { documents: [] } }], conn);
  await action.execute!({ ids: "article-1, drafts.article-1" }, ctx);
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v2025-02-19/data/doc/production/article-1,drafts.article-1",
  );
});

Deno.test("document-get: a missing id list is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "ids");
  assertEquals(calls.length, 0);
});
