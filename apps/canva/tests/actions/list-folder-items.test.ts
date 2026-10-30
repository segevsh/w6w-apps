import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-folder-items.ts";

test("list-folder-items: GETs /rest/v1/folders/{id}/items", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ folderId: "root" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/folders/root/items");
});

test("list-folder-items: joins itemTypes into a comma-delimited list", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ folderId: "root", itemTypes: ["design", "brand_template"] }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("item_types"), "design,brand_template");
});

test("list-folder-items: omits item_types when none are selected", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ folderId: "root" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.has("item_types"), false);
});
