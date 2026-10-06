import { assertEquals } from "@std/assert";
import action from "../../actions/project-queried-tables-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("project-queried-tables-list: GET queriedTables with cursor params", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ name: "orders" }]) }]);
  const out = await action.execute({ projectId: "p1", limit: 5, after: "c" }, ctx) as {
    values: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/projects/p1/queriedTables");
  assertEquals(queryOf(calls[0].url), { limit: "5", after: "c" });
  assertEquals(out.values.length, 1);
});
