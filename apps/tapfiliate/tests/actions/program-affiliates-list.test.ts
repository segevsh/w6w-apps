import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import programAffiliatesList from "../../actions/program-affiliates-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("program-affiliates-list: nests under the program and maps its filters", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "janejameson" }] }]);
  await programAffiliatesList.execute(
    { programId: "johns-affiliate-program", sourceId: "1-ssssss", email: "jane@example-blog.inc" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/1.6/programs/johns-affiliate-program/affiliates/");
  assertEquals(queryOf(calls[0].url), { source_id: "1-ssssss", email: "jane@example-blog.inc" });
});
