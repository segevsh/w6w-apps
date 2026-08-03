import { assertEquals } from "@std/assert";
import siteList from "../../actions/site-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("site-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "sites") }]);
  await siteList.execute({
    titleContains: "t",
    subdomainContains: "s",
    sort: "-title",
    pageNumber: 2,
    pageSize: 50,
    fields: "title",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/sites");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[title_cont]"], "t");
  assertEquals(q["filter[subdomain_cont]"], "s");
  assertEquals(q["sort"], "-title");
  assertEquals(q["page[number]"], "2");
  assertEquals(q["page[size]"], "50");
  assertEquals(q["fields[sites]"], "title");
});

Deno.test("site-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "sites") }]);
  await siteList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
