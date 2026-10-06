import { assertEquals } from "@std/assert";
import action from "../../actions/data-connection-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("data-connection-list: GET /data-connections with sort and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: "d1", type: "snowflake" }]) }]);
  const out = await action.execute(
    { sortBy: "CREATED_AT", sortDirection: "DESC", limit: 3 },
    ctx,
  ) as {
    values: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/data-connections");
  assertEquals(queryOf(calls[0].url), { sortBy: "CREATED_AT", sortDirection: "DESC", limit: "3" });
  assertEquals(out.values.length, 1);
});
