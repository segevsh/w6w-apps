import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-page.ts";

Deno.test("get-page: GETs /{pageId} with default fields", async () => {
  const body = { id: "page-1", name: "My Page" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ pageId: "page-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/page-1");
  assertEquals(url.searchParams.get("fields"), "id,name,about,category,fan_count,link,website,picture");
  assertEquals(result, body);
});

Deno.test("get-page: honours a custom fields override", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "page-1" } }]);
  await action.execute!({ pageId: "page-1", fields: "id,name" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("fields"), "id,name");
});
