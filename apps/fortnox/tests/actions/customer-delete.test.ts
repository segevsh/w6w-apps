import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/customer-delete.ts";

Deno.test("customer-delete: DELETE /3/customers/{customerNumber} and reports deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ "customerNumber": "customerNumber-v" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/3/customers/customerNumber-v");
  assertEquals(result, { deleted: true });
});
