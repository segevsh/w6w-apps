import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import mandateGet from "../../actions/mandate-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("mandate-get: fetches /customers/{id}/mandates/{mandateId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "mdt_1", status: "valid" } }]);
  const out = await mandateGet.execute({ customerId: "cst_1", mandateId: "mdt_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/customers/cst_1/mandates/mdt_1");
  assertEquals(out, { id: "mdt_1", status: "valid" });
});
