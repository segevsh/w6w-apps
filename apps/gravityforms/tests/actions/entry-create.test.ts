import { assert, assertEquals } from "@std/assert";
import { BASE_PATH, bodyOf, DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/entry-create.ts";

const fieldValues = { "1.3": "Neil", "1.6": "Armstrong", "3": "neil@example.com" };

Deno.test("entry-create: POSTs to the form-scoped /forms/{id}/entries route", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "160" } }], { display: DISPLAY });
  await action.execute!({ formId: 30, fieldValues }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms/30/entries`);
});

Deno.test("entry-create: field values sit at the top level, keyed by field ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, fieldValues }, ctx);
  assertEquals(bodyOf(calls), fieldValues);
});

Deno.test("entry-create: maps every optional property onto its documented key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({
    formId: 30,
    fieldValues,
    createdBy: 7,
    dateCreated: "2026-08-03 19:30:44",
    ip: "203.0.113.9",
    sourceUrl: "https://example.com/contact",
    userAgent: "w6w",
    status: "active",
    paymentAmount: "12.00",
    paymentDate: "2026-08-03 19:31:00",
    paymentMethod: "Stripe",
    paymentStatus: "Paid",
    transactionId: "txn_1",
    transactionType: "1",
  }, ctx);
  const body = bodyOf(calls);
  assertEquals(body.created_by, 7);
  assertEquals(body.date_created, "2026-08-03 19:30:44");
  assertEquals(body.ip, "203.0.113.9");
  assertEquals(body.source_url, "https://example.com/contact");
  assertEquals(body.user_agent, "w6w");
  assertEquals(body.status, "active");
  assertEquals(body.payment_amount, "12.00");
  assertEquals(body.payment_date, "2026-08-03 19:31:00");
  assertEquals(body.payment_method, "Stripe");
  assertEquals(body.payment_status, "Paid");
  assertEquals(body.transaction_id, "txn_1");
  assertEquals(body.transaction_type, "1");
});

Deno.test("entry-create: the is_* flags go out as 0/1 integers, both ways", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({
    formId: 30,
    fieldValues,
    isRead: true,
    isStarred: false,
    isFulfilled: true,
  }, ctx);
  const body = bodyOf(calls);
  assertEquals(body.is_read, 1);
  assertEquals(body.is_starred, 0);
  assertEquals(body.is_fulfilled, 1);
});

Deno.test("entry-create: unset optional properties are omitted, not sent as null", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, fieldValues }, ctx);
  const body = bodyOf(calls);
  for (const k of ["created_by", "ip", "status", "is_read", "payment_amount"]) {
    assert(!(k in body), `${k} should be omitted`);
  }
});

Deno.test("entry-create: an empty field-value map still produces a valid body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, fieldValues: {} }, ctx);
  assertEquals(bodyOf(calls), {});
});

Deno.test("entry-create: logs the write and is declared non-idempotent", async () => {
  const { ctx, logs } = mockCtx([{ body: {} }], { display: DISPLAY });
  await action.execute!({ formId: 30, fieldValues }, ctx);
  assertEquals(logs[0].level, "info");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
