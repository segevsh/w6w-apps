import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-collections.ts";
import { mockCtx } from "../_helpers.ts";
import { SCOPE_HEADER } from "../../lib/client.ts";

Deno.test("list-collections: GETs /wix-data/v2/collections with no invented defaults", async () => {
  const { ctx, calls } = mockCtx([{ body: { collections: [] } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.host, "www.wixapis.com");
  assertEquals(url.pathname, "/wix-data/v2/collections");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-collections: forwards paging and sort as Wix's dotted query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { collections: [] } }]);
  await action.execute!({ limit: 10, offset: 20, sortFieldName: "id", sortOrder: "DESC" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("paging.limit"), "10");
  assertEquals(p.get("paging.offset"), "20");
  assertEquals(p.get("sort.fieldName"), "id");
  assertEquals(p.get("sort.order"), "DESC");
});

Deno.test("list-collections: is site-scoped and carries no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { collections: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].headers[SCOPE_HEADER], "site");
  assert(!("authorization" in calls[0].headers));
  assert(!("wix-site-id" in calls[0].headers));
});

Deno.test("list-collections: returns the response body verbatim", async () => {
  const body = { collections: [{ id: "Cities" }], pagingMetadata: { count: 1 } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
  assertEquals(action.type, "search");
});
