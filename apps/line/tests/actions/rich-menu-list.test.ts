import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import richMenuList from "../../actions/rich-menu-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("rich-menu-list: GETs /v2/bot/richmenu/list and unwraps richmenus", async () => {
  const { ctx, calls } = mockCtx([
    { body: { richmenus: [{ richMenuId: "r1", name: "Nice rich menu" }] } },
  ]);
  const out = await richMenuList.execute({}, ctx) as { richmenus: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/bot/richmenu/list");
  assertEquals(out.richmenus.length, 1);
});

test("rich-menu-list: an empty response body still returns an empty array", async () => {
  const { ctx } = mockCtx([{ body: undefined }]);
  const out = await richMenuList.execute({}, ctx) as { richmenus: unknown[] };
  assertEquals(out.richmenus, []);
});
