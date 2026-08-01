import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-folder-items.ts";

Deno.test("list-folder-items: GETs /folders/{id}/items with defaults", async () => {
  const resp = { entries: [], total_count: 0, offset: 0, limit: 100 };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders/0/items");
  assertEquals(calls[0].method, "GET");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("offset"), "0");
  assertEquals(url.searchParams.get("usemarker"), "false");
  assertEquals(result, resp);
});

Deno.test("list-folder-items: uses the given folderId and forwards sort/direction", async () => {
  const { ctx, calls } = mockCtx([{ body: { entries: [] } }]);
  await action.execute!({ folderId: "42", sort: "name", direction: "ASC" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/folders/42/items");
  assertEquals(url.searchParams.get("sort"), "name");
  assertEquals(url.searchParams.get("direction"), "ASC");
});
