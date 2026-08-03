import { assertEquals } from "@std/assert";
import action from "../../actions/list-labels.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-labels: GETs /contacts/v4/labels with no invented defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { labels: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/contacts/v4/labels");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-labels: forwards labelType, language, paging and sort", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    labelType: "USER_DEFINED",
    language: "es",
    limit: 25,
    offset: 50,
    sortFieldName: "key",
    sortOrder: "DESC",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("labelType"), "USER_DEFINED");
  assertEquals(p.get("language"), "es");
  assertEquals(p.get("paging.limit"), "25");
  assertEquals(p.get("paging.offset"), "50");
  assertEquals(p.get("sort.fieldName"), "key");
  assertEquals(p.get("sort.order"), "DESC");
});

Deno.test("list-labels: is a search action returning the body", async () => {
  const body = { labels: [{ key: "custom.vip" }] };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
  assertEquals(action.type, "search");
});
