import { assertEquals } from "@std/assert";
import tags from "../../actions/tags-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tags-list: defaults to types=1 only", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [{ id: "user/1/label/A", type: "folder" }] } }]);
  const out = await tags.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/reader/api/0/tag/list");
  assertEquals(queryOf(calls[0].url), { types: "1" });
  assertEquals(out, { tags: [{ id: "user/1/label/A", type: "folder" }], count: 1 });
});

Deno.test("tags-list: counts forces types=1, even when types was switched off", async () => {
  const { ctx, calls } = mockCtx([{ body: { tags: [] } }]);
  await tags.execute({ includeTypes: false, includeCounts: true, teamAssets: true }, ctx);
  assertEquals(queryOf(calls[0].url), { types: "1", counts: "1", team_assets: "1" });
});

Deno.test("tags-list: types off sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const out = await tags.execute({ includeTypes: false }, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out, { tags: [], count: 0 });
});
