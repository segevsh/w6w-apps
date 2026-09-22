import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/invoices-get.ts";

const sample = { id: 6, object: "invoice", status: "paid", is_credit_note: false };

Deno.test("invoices-get: reads /invoices/6 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 6 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/invoices/6");
  assertEquals(result.status, "paid");
});

Deno.test("invoices-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 6 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

Deno.test("invoices-get: declares the invoice status vocabulary", () => {
  const fields = action.output as Array<{ key: string; label: string }>;
  const status = fields.find((f) => f.key === "status")!.label;
  for (
    const value of [
      "open",
      "paid",
      "pending_offline",
      "pending",
      "failed",
      "voided",
      "retrying",
      "retry_failed",
      "upcoming",
      "draft",
      "skipped",
    ]
  ) {
    assertEquals(status.includes(value), true, `${value} missing from ${status}`);
  }
});
