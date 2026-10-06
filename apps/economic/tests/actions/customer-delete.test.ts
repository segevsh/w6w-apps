import { assertEquals } from "@std/assert";
import action from "../../actions/customer-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("customer-delete: DELETEs /customers/{n} and tolerates the empty 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ customerNumber: 7 }, ctx), { deleted: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://restapi.e-conomic.com/customers/7");
});
