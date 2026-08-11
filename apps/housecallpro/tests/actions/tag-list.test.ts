import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { mockCtx, optionValues, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: calls GET /tags", async () => {
  const { ctx, calls } = mockCtx([{ body: page("tags", [{ id: "t1", name: "VIP" }]) }]);
  const out = await tagList.execute({ sortBy: "name", sortDirection: "asc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tags");
  assertEquals(queryOf(calls[0].url), { sort_by: "name", sort_direction: "asc" });
  assertEquals(out.items, [{ id: "t1", name: "VIP" }]);
});

Deno.test("tag-list: offers only the two documented sort keys", () => {
  const values = optionValues(tagList.params?.find((p) => p.key === "sortBy"));
  assertEquals(values, ["created_at", "name"]);
});
