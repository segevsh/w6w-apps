import { assertEquals } from "@std/assert";
import customFieldList from "../../actions/custom-field-list.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("custom-field-list: GETs the collection with every documented filter mapped", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "custom_fields") }]);
  await customFieldList.execute({
    siteId: "111",
    titleContains: "fav",
    type: "TextField",
    required: true,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/custom_fields");
  const q = queryOf(calls[0]);
  assertEquals(q["filter[site_id]"], "111");
  assertEquals(q["filter[title_cont]"], "fav");
  assertEquals(q["filter[type_eq]"], "TextField");
  assertEquals(q["filter[required_eq]"], "true");
});

Deno.test("custom-field-list: sends no query at all when nothing is filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: collection(["1"], "custom_fields") }]);
  await customFieldList.execute({}, ctx);
  assertEquals(queryOf(calls[0]), {});
});
