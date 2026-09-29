import { assertEquals } from "@std/assert";
import transactionGet from "../../actions/transaction-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-get: GET /transactions/show?id=", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "t1", type: "transaction", attributes: { state: "state/pending" } } },
    },
  ]);
  const result = await transactionGet.execute({ id: "t1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/transactions/show");
  assertEquals(queryOf(calls[0].url), { id: "t1" });
  assertEquals((result as { attributes: { state: string } }).attributes.state, "state/pending");
});
