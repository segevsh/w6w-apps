import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoice-adjustment-list.ts";

Deno.test("invoice-adjustment-list: lists adjustments with filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "a1" }], page: {} } }], {
    display: {},
  });
  const result = await action.execute!({ contractId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/invoice-adjustments");
  assertEquals(new URL(calls[0].url).searchParams.get("contract_id"), "c1");
  assertEquals(result, [{ id: "a1" }]);
});
