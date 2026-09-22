import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-get.ts";

Deno.test("list-get: the list id is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "7", name: "Q3" } }]);
  const result = await action.execute!({ listId: 7 }, ctx);
  assertEquals(calls[0].url, "https://api.heyreach.io/api/public/list/GetById?listId=7");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "7", name: "Q3" });
});
