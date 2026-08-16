import { assertEquals } from "@std/assert";
import adAccountList from "../../actions/ad-account-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ad-account-list: with no filters still sends q=search and no search param", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await adAccountList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts");
  const q = queryOf(calls[0].url);
  assertEquals(q.q, "search");
  assertEquals("search" in q, false);
  assertEquals(q.pageSize, "50");
});

Deno.test("ad-account-list: builds a search from statuses, types and a CSV id list", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await adAccountList.execute(
    {
      statuses: ["ACTIVE", "CANCELED"],
      types: ["BUSINESS"],
      ids: "1, 2 ,3",
      sortOrder: "DESCENDING",
    },
    ctx,
  );

  const q = queryOf(calls[0].url);
  assertEquals(
    q.search,
    "(id:(values:List(1,2,3)),status:(values:List(ACTIVE,CANCELED)),type:(values:List(BUSINESS)))",
  );
  assertEquals(q.sortOrder, "DESCENDING");
});

Deno.test("ad-account-list: the test tri-state becomes a scalar search.test", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await adAccountList.execute({ test: "true" }, ctx);
  assertEquals(queryOf(calls[0].url).search, "(test:true)");
});

Deno.test("ad-account-list: passes pageToken through for the next page", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  await adAccountList.execute({ pageToken: "abc123" }, ctx);
  assertEquals(queryOf(calls[0].url).pageToken, "abc123");
});

Deno.test("ad-account-list: returns the elements/metadata body verbatim", async () => {
  const body = { elements: [{ id: 1, name: "A" }], metadata: { nextPageToken: "next" } };
  const { ctx } = mockCtx([{ body }]);
  const result = await adAccountList.execute({}, ctx);
  assertEquals(result, body);
});
