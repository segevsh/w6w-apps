import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-photos.ts";

test("list-photos: GETs /{pageId}/photos with fields and default type=uploaded", async () => {
  const body = { data: [{ id: "photo-1" }], paging: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1/photos");
  assertEquals(url.searchParams.get("fields"), "id,name,created_time,link");
  assertEquals(url.searchParams.get("type"), "uploaded");
  assertEquals(result, body);
});

test("list-photos: honours type=tagged", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ pageId: "page-1", type: "tagged" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "tagged");
});
