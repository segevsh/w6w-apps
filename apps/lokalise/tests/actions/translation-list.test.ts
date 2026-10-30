import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import translationList from "../../actions/translation-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("translation-list: lists translation rows and forwards review filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { translations: [{ translation_id: 1 }] } }]);
  const out = await translationList.execute(
    { projectId: "p1", filterIsReviewed: true, filterLangId: 3, limit: 100 },
    ctx,
  ) as { items: unknown[] };
  assertEquals(pathOf(calls[0].url), "/api2/projects/p1/translations");
  assertEquals(queryOf(calls[0].url), {
    filter_is_reviewed: "1",
    filter_lang_id: "3",
    limit: "100",
  });
  assertEquals(out.items, [{ translation_id: 1 }]);
});
