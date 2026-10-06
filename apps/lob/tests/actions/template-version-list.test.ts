import { assertEquals, assertRejects } from "@std/assert";
import templateVersionList from "../../actions/template-version-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-version-list: GETs the template's versions and flattens the page", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "vrsn_1" }], count: 1, next_url: null },
  }]);
  const out = await templateVersionList.execute({ templateId: "tmpl_1", limit: 5 }, ctx) as {
    items: unknown[];
    nextCursor: string | null;
  };
  assertEquals(pathOf(calls[0].url), "/v1/templates/tmpl_1/versions");
  assertEquals(queryOf(calls[0].url), { limit: "5" });
  assertEquals(out.items, [{ id: "vrsn_1" }]);
  assertEquals(out.nextCursor, null);
});

Deno.test("template-version-list: refuses both cursors", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () =>
      await templateVersionList.execute({ templateId: "t", after: "a", before: "b" }, ctx),
    Error,
    "only one",
  );
});
