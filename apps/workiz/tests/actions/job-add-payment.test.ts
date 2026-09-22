import { assertEquals } from "@std/assert";
import jobAddPayment from "../../actions/job-add-payment.ts";
import { bodyOf, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * The one call where a value is required twice: `type` goes out as a required
 * query parameter AND as a required body field, from the same input.
 */
Deno.test("job-add-payment: sends type in both the query and the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { flag: true, msg: "ok", data: { paymentId: 7 } } }]);
  const out = await jobAddPayment.execute(
    {
      uuid: "j1",
      type: "credit",
      amount: 120.5,
      date: "2026-09-23T10:00:00Z",
      authSecret: "sec_1",
    },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/job/addPayment/j1/");
  assertEquals(queryOf(calls[0].url), { type: "credit" });
  assertEquals(bodyOf(calls[0]), {
    auth_secret: "sec_1",
    amount: 120.5,
    type: "credit",
    date: "2026-09-23T10:00:00Z",
  });
  assertEquals(out, { flag: true, msg: "ok", data: { paymentId: 7 } });
});

Deno.test("job-add-payment: an optional reference rides along when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { flag: true } }]);
  await jobAddPayment.execute(
    {
      uuid: "j1",
      type: "check",
      amount: 50,
      date: "2026-09-23",
      authSecret: "s",
      reference: "cheque-1042",
    },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).reference, "cheque-1042");
});

Deno.test("job-add-payment: the required set matches Workiz's addPaymentBody", () => {
  for (const key of ["uuid", "type", "amount", "date", "authSecret"]) {
    assertEquals(jobAddPayment.params?.find((p) => p.key === key)?.required, true, key);
  }
  const type = jobAddPayment.params?.find((p) => p.key === "type");
  assertEquals(type?.type, "select");
  assertEquals((type?.options as Array<{ value: string }>).map((o) => o.value), [
    "cash",
    "credit",
    "check",
  ]);
});

/** Each call records a new payment, so a retry books the money twice. */
Deno.test("job-add-payment: recording a payment is not idempotent", () => {
  assertEquals(jobAddPayment.idempotent, false);
});
