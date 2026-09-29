import { assertEquals } from "@std/assert";
import transactionTransitionSpeculative from "../../actions/transaction-transition-speculative.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-transition-speculative: POST /transactions/transition_speculative, idempotent", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: { data: { id: "t1", type: "transaction", attributes: { lineItems: [] } } },
    },
  ]);
  await transactionTransitionSpeculative.execute(
    { id: "t1", transition: "transition/accept" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/transactions/transition_speculative");
  assertEquals(transactionTransitionSpeculative.idempotent, true);
});
