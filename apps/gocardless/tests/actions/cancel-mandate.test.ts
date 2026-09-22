import { assertEquals, assertRejects } from "@std/assert";
import cancelMandate from "../../actions/cancel-mandate.ts";
import { envelope, errorBody, mockCtx, mockCtxWithInvocation, pathOf } from "../_helpers.ts";

Deno.test("cancel-mandate: POST …/actions/cancel with the empty action envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope("mandates", { id: "MD1", status: "cancelled" }),
  }]);
  const out = await cancelMandate.execute!({ mandateId: "MD1" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/mandates/MD1/actions/cancel");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { mandates: {} });
  assertEquals((out as { status: string }).status, "cancelled");
});

/**
 * GoCardless refuses a repeated cancel with `invalid_state` rather than ignoring
 * it, so this endpoint is not a create and an idempotency key would only imply a
 * retry is safe when it is not.
 */
Deno.test("cancel-mandate: sends no Idempotency-Key even inside a workflow step", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ body: envelope("mandates", { id: "MD1" }) }],
    "inv-abcdef",
  );
  await cancelMandate.execute!({ mandateId: "MD1" }, ctx);
  assertEquals("idempotency-key" in calls[0].headers, false);
});

Deno.test("cancel-mandate: a repeated cancel surfaces invalid_state", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid_state", {
      code: 422,
      message: "Mandate is already cancelled",
      errors: [{ reason: "cancellation_failed", message: "Mandate has already been cancelled" }],
    }),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(cancelMandate.execute!({ mandateId: "MD1" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422 invalid_state/cancellation_failed"), true, err.message);
  assertEquals(err.message.includes("POST /mandates/MD1/actions/cancel"), true, err.message);
});
