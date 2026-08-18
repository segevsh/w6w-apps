import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/adjustment-category-list.ts";

Deno.test("adjustment-category-list: reads the ids invoice-adjustment-create needs", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "cat1" }] } }], {
    display: {},
  });
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/adjustments/categories");
  assertEquals(result, { data: [{ id: "cat1" }] });
});
