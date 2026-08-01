import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/payout-create.ts";

Deno.test("payout-create: posts the sender batch header and mapped items", async () => {
  const { ctx, calls } = mockCtx([{ body: { batch_header: { payout_batch_id: "B-1" } } }]);
  const result = await action.execute!(
    {
      senderBatchId: "batch-1",
      items: [{ receiver: "a@b.com", amount: { value: "10.00", currency: "USD" } }],
    },
    ctx,
  );
  assertEquals(calls[0].url, "https://api-m.paypal.com/v1/payments/payouts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.sender_batch_header, { sender_batch_id: "batch-1" });
  assertEquals(body.items, [{
    recipient_type: "EMAIL",
    receiver: "a@b.com",
    amount: { value: "10.00", currency: "USD" },
  }]);
  assertEquals(result, { batch_header: { payout_batch_id: "B-1" } });
});

Deno.test("payout-create: additionalFields populate the sender batch header", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      senderBatchId: "batch-1",
      items: [{ receiver: "a@b.com", amount: { value: "10.00", currency: "USD" } }],
      additionalFields: { emailSubject: "You got paid", emailMessage: "Thanks", note: "note" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.sender_batch_header, {
    sender_batch_id: "batch-1",
    email_subject: "You got paid",
    email_message: "Thanks",
    note: "note",
  });
});

Deno.test("payout-create: items also accepts a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    {
      senderBatchId: "batch-1",
      items: '[{"receiver":"a@b.com","amount":{"value":"1.00","currency":"USD"}}]',
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.items.length, 1);
});

Deno.test("payout-create: senderBatchId is required", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!(
          {
            senderBatchId: "",
            items: [{ receiver: "a@b.com", amount: { value: "1", currency: "USD" } }],
          },
          ctx,
        ),
      ),
    Error,
    "`senderBatchId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payout-create: items must be a non-empty array", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!({ senderBatchId: "b-1", items: [] }, ctx)),
    Error,
    "`items`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("payout-create: each item needs a receiver and amount", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute!({ senderBatchId: "b-1", items: [{ receiver: "a@b.com" }] }, ctx),
      ),
    Error,
    "items[0]",
  );
  assertEquals(calls.length, 0);
});
