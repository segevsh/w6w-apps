import { assertEquals } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "forms") }]);
  await formList.execute({ siteId: "111", titleContains: "c", sort: "title" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/forms");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[title_cont]"], "c");
  assertEquals(q["sort"], "title");
});

Deno.test("form-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "forms") }]);
  await formList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
