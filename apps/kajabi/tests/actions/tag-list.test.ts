import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contact_tags") }]);
  await tagList.execute({
    siteId: "111",
    nameContains: "vip",
    sort: "name",
    pageNumber: 1,
    pageSize: 10,
    fields: "name",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/contact_tags");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[name_cont]"], "vip");
  assertEquals(q["sort"], "name");
  assertEquals(q["fields[contact_tags]"], "name");
});

Deno.test("tag-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "contact_tags") }]);
  await tagList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
