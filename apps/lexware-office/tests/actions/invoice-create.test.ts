import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/invoice-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const voucher = { voucherDate: "2026-10-06T00:00:00.000+02:00", lineItems: [] };
const result = { id: "n1", resourceUri: "https://api.lexware.io/v1/invoices/n1", version: 0 };

Deno.test("invoice-create: POSTs the body as JSON to /v1/invoices with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: result }]);
  const out = await action.execute({ voucher }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/invoices");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), voucher);
  assertEquals(out.id, "n1");
  assertEquals(action.idempotent, false);
});

Deno.test("invoice-create: finalize adds ?finalize=true; a JSON string body is parsed", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: result }]);
  await action.execute({ voucher: JSON.stringify(voucher), finalize: true }, ctx);
  assertEquals(queryOf(calls[0].url), { finalize: "true" });
  assertEquals(JSON.parse(calls[0].body!), voucher);
});

Deno.test("invoice-create: rejects non-object bodies before the network, and surfaces 406 details", async () => {
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ voucher: "[1]" }, none.ctx),
    Error,
    "JSON object",
  );
  await assertRejects(
    async () => await action.execute({ voucher: "{nope" }, none.ctx),
    Error,
    "valid JSON",
  );
  assertEquals(none.calls.length, 0);
  const bad = mockCtx([{
    status: 406,
    body: {
      status: 406,
      message: "Validation failed for request.",
      details: [{ violation: "NOTNULL", field: "lineItems[0].unitPrice.taxRatePercentage" }],
    },
  }]);
  const err = await assertRejects(async () => await action.execute({ voucher }, bad.ctx), Error);
  assert(err.message.includes("lineItems[0].unitPrice.taxRatePercentage: NOTNULL"));
});
