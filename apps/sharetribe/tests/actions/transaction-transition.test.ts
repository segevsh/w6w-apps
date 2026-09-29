import { assertEquals } from "@std/assert";
import transactionTransition from "../../actions/transaction-transition.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("transaction-transition: POST /transactions/transition with id/transition/params", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: {
          id: "t1",
          type: "transaction",
          attributes: { lastTransition: "transition/accept" },
        },
      },
    },
  ]);
  await transactionTransition.execute(
    { id: "t1", transition: "transition/accept", params: '{"foo":"bar"}' },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/integration_api/transactions/transition");
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body, { id: "t1", transition: "transition/accept", params: { foo: "bar" } });
});

Deno.test("transaction-transition: defaults params to {} when not given, not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "t1" } } }]);
  await transactionTransition.execute({ id: "t1", transition: "transition/accept" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.params, {});
  assertEquals(transactionTransition.idempotent, false);
});
