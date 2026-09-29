import { assertEquals } from "@std/assert";
import transactionList from "../../actions/transaction-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-list: GET /transactions/query with filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "t1" }]) }]);
  await transactionList.execute(
    { providerId: "u1", lastTransitions: "transition/request", states: "state/pending" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/transactions/query");
  assertEquals(queryOf(calls[0].url), {
    providerId: "u1",
    lastTransitions: "transition/request",
    states: "state/pending",
  });
});
