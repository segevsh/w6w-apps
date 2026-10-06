import { assertEquals } from "@std/assert";
import entityList from "../../actions/entity-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("entity-list: GET /entities with search and sort", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "e1" }]) }]);
  await entityList.execute({ search: "acme", sortField: "name", sortDirection: "ASC" }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/api/v1/entities");
  assertEquals(queryOf(calls[0].url), { search: "acme", sortField: "name", sortDirection: "ASC" });
});
