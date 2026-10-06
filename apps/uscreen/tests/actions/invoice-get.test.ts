import { assertEquals, assertRejects } from "@std/assert";
import invoiceGet from "../../actions/invoice-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("invoice-get: sends GET /invoices/${seg(input.invoiceId)}", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": "i1" } }]);
  const out = await invoiceGet.execute({ "invoiceId": "i1" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/invoices/i1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "id": "i1" });
});

Deno.test("invoice-get: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () => invoiceGet.execute({ "invoiceId": "i1" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
